// API Base URL
const API_BASE = window.location.origin;

// Application State
const state = {
    currentSessionId: null,
    requests: [],
    isRecording: false,
    updateInterval: null,
    filters: {
        headers: true,
        payload: true,
        preview: true,
        response: true
    },
    showJsonOnly: false
};

// DOM Elements
const elements = {
    targetUrl: document.getElementById('targetUrl'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    resetBtn: document.getElementById('resetBtn'),
    sessionInfo: document.getElementById('sessionInfo'),
    sessionName: document.getElementById('sessionName'),
    statusIndicator: document.getElementById('statusIndicator'),
    totalRequests: document.getElementById('totalRequests'),
    recordingStatus: document.getElementById('recordingStatus'),
    requestsTableBody: document.getElementById('requestsTableBody'),
    searchInput: document.getElementById('searchInput'),
    clearBtn: document.getElementById('clearBtn'),
    jsonOnlyFilter: document.getElementById('jsonOnlyFilter'),
    requestModal: document.getElementById('requestModal'),
    closeModal: document.getElementById('closeModal'),
    modalTitle: document.getElementById('modalTitle'),
    copyCurlBtn: document.getElementById('copyCurlBtn'),
    filterHeaders: document.getElementById('filterHeaders'),
    filterPayload: document.getElementById('filterPayload'),
    filterPreview: document.getElementById('filterPreview'),
    filterResponse: document.getElementById('filterResponse'),
    navigationPanel: document.getElementById('navigationPanel'),
    navigateUrl: document.getElementById('navigateUrl'),
    navigateBtn: document.getElementById('navigateBtn')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure initial state is correct
    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.targetUrl.disabled = false;
    
    setupEventListeners();
    loadFilters();
    checkExistingSessions();
});

// Event Listeners
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);
    elements.resetBtn.addEventListener('click', handleReset);
    elements.clearBtn.addEventListener('click', clearRequests);
    elements.searchInput.addEventListener('input', filterRequests);
    elements.jsonOnlyFilter.addEventListener('change', toggleJsonFilter);
    elements.closeModal.addEventListener('click', closeModal);
    elements.copyCurlBtn.addEventListener('click', copyAsCurl);
    
    // Navigation
    elements.navigateBtn.addEventListener('click', navigateToUrl);
    elements.navigateUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            navigateToUrl();
        }
    });
    
    // Filter checkboxes
    elements.filterHeaders.addEventListener('change', updateFilters);
    elements.filterPayload.addEventListener('change', updateFilters);
    elements.filterPreview.addEventListener('change', updateFilters);
    elements.filterResponse.addEventListener('change', updateFilters);
    
    // Close modal on outside click
    elements.requestModal.addEventListener('click', (e) => {
        if (e.target === elements.requestModal) {
            closeModal();
        }
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
}

// Start Recording
async function startRecording() {
    const targetUrl = elements.targetUrl.value.trim();
    
    if (!targetUrl) {
        alert('Please enter a target URL');
        return;
    }
    
    try {
        elements.startBtn.disabled = true;
        
        // Create session
        const sessionResponse = await fetch(`${API_BASE}/api/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `Recording - ${new Date().toLocaleString()}`,
                filters: state.filters
            })
        });
        
        if (!sessionResponse.ok) {
            let errorMessage = 'Failed to create session';
            try {
                const errorData = await sessionResponse.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${sessionResponse.status}: ${sessionResponse.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const session = await sessionResponse.json();
        state.currentSessionId = session.sessionId;
        
        // Start session
        const startResponse = await fetch(`${API_BASE}/api/sessions/${session.sessionId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetUrl })
        });
        
        if (!startResponse.ok) {
            let errorMessage = 'Failed to start recording';
            try {
                const errorData = await startResponse.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                // If we can't parse the error, use the status text
                errorMessage = `HTTP ${startResponse.status}: ${startResponse.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        // Update UI
        state.isRecording = true;
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = false;
        elements.targetUrl.disabled = true;
        elements.sessionInfo.style.display = 'flex';
        elements.sessionName.textContent = session.name;
        elements.statusIndicator.className = 'status-indicator recording';
        elements.recordingStatus.textContent = 'Recording';
        elements.recordingStatus.style.color = 'var(--danger-color)';
        
        // Show navigation panel
        elements.navigationPanel.style.display = 'block';
        elements.navigateUrl.value = '';
        
        // Clear previous requests
        state.requests = [];
        renderRequests();
        
        // Start polling for requests
        startPolling();
        
    } catch (error) {
        console.error('Error starting recording:', error);
        
        // Format error message for better display
        let errorMessage = error.message || 'Unknown error occurred';
        
        // Check if this is a Playwright installation error
        if (errorMessage.includes('npx playwright install') || 
            errorMessage.includes('Playwright browsers are not installed')) {
            errorMessage = 'Playwright browsers are not installed.\n\n' +
                          'Please run the following command in your terminal:\n\n' +
                          'npx playwright install chromium\n\n' +
                          'Then try starting the recording again.';
        }
        
        alert(`Failed to start recording:\n\n${errorMessage}`);
        elements.startBtn.disabled = false;
    }
}

// Stop Recording
async function stopRecording() {
    if (!state.currentSessionId) {
        // No session ID, just reset UI
        resetUI();
        return;
    }
    
    try {
        elements.stopBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/api/sessions/${state.currentSessionId}/stop`, {
            method: 'POST'
        });
        
        let errorMessage = null;
        if (!response.ok) {
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
        }
        
        // Even if stopping fails, reset the UI to allow new recordings
        // The session might be in a bad state, but we shouldn't block the user
        resetUI();
        
        if (errorMessage) {
            console.warn('Stop recording had issues:', errorMessage);
            // Show a warning but don't block - UI is already reset
            if (confirm(`Recording stop had issues: ${errorMessage}\n\nUI has been reset. Would you like to check the session status?`)) {
                await checkExistingSessions();
            }
        } else {
            // Success - final update
            await updateRequests();
        }
        
    } catch (error) {
        console.error('Error stopping recording:', error);
        // Reset UI even on error
        resetUI();
        alert(`Error stopping recording: ${error.message}\n\nUI has been reset. You can start a new recording.`);
    }
}

// Reset UI to initial state
function resetUI() {
    state.isRecording = false;
    state.currentSessionId = null;
    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.targetUrl.disabled = false;
    elements.sessionInfo.style.display = 'none';
    elements.statusIndicator.className = 'status-indicator idle';
    elements.recordingStatus.textContent = 'Idle';
    elements.recordingStatus.style.color = 'var(--text-secondary)';
    
    // Hide navigation panel
    elements.navigationPanel.style.display = 'none';
    
    // Stop polling
    stopPolling();
}

// Navigate to URL
async function navigateToUrl() {
    const url = elements.navigateUrl.value.trim();
    
    if (!url) {
        alert('Please enter a URL to navigate to');
        return;
    }
    
    if (!state.currentSessionId) {
        alert('No active recording session');
        return;
    }
    
    try {
        elements.navigateBtn.disabled = true;
        elements.navigateBtn.textContent = 'Loading...';
        
        const response = await fetch(`${API_BASE}/api/sessions/${state.currentSessionId}/navigate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to navigate';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        // Clear the input after successful navigation
        elements.navigateUrl.value = '';
        
        // Trigger an immediate update of requests
        await updateRequests();
        
    } catch (error) {
        console.error('Error navigating:', error);
        alert(`Failed to navigate: ${error.message}`);
    } finally {
        elements.navigateBtn.disabled = false;
        elements.navigateBtn.innerHTML = '<span class="btn-icon">🔗</span> Go';
    }
}

// Polling for requests
function startPolling() {
    if (state.updateInterval) {
        clearInterval(state.updateInterval);
    }
    
    // Immediate update
    updateRequests();
    
    // Then poll every 2 seconds
    state.updateInterval = setInterval(() => {
        if (state.isRecording) {
            updateRequests();
        }
    }, 2000);
}

function stopPolling() {
    if (state.updateInterval) {
        clearInterval(state.updateInterval);
        state.updateInterval = null;
    }
}

// Update Requests
async function updateRequests() {
    if (!state.currentSessionId) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/sessions/${state.currentSessionId}/requests`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch requests');
        }
        
        const requests = await response.json();
        
        // Check for new requests
        const previousCount = state.requests.length;
        state.requests = requests;
        
        // Render requests (this will update stats via updateRequestCount)
        renderRequests();
        
        // Update stats
        updateRequestCount();
        
        // Highlight new requests
        if (requests.length > previousCount) {
            highlightNewRequests(previousCount);
        }
        
    } catch (error) {
        console.error('Error updating requests:', error);
    }
}

// Check if request has JSON response
function isJsonResponse(request) {
    if (!request) return false;
    
    // Check mimeType (from response)
    if (request.mimeType) {
        const mimeType = String(request.mimeType).toLowerCase();
        if (mimeType.includes('json') || mimeType.includes('application/json')) {
            return true;
        }
    }
    
    // Check response headers
    if (request.responseHeaders) {
        const headers = typeof request.responseHeaders === 'string' 
            ? JSON.parse(request.responseHeaders || '{}')
            : request.responseHeaders;
        
        const contentType = headers['Content-Type'] || 
                           headers['content-type'] ||
                           headers['CONTENT-TYPE'] ||
                           headers['Content-type'];
        
        if (contentType) {
            const ct = String(contentType).toLowerCase();
            if (ct.includes('json') || ct.includes('application/json')) {
                return true;
            }
        }
    }
    
    // Check if response body is JSON (if available)
    if (request.body) {
        try {
            const body = typeof request.body === 'string' ? request.body : String(request.body);
            // Try to parse as JSON
            JSON.parse(body);
            return true;
        } catch (e) {
            // Not JSON
        }
    }
    
    // Check preview (if it was parsed as JSON)
    if (request.preview) {
        const preview = typeof request.preview === 'string' 
            ? JSON.parse(request.preview || '{}')
            : request.preview;
        if (preview && preview.type === 'json') {
            return true;
        }
    }
    
    return false;
}

// Toggle JSON filter
function toggleJsonFilter() {
    state.showJsonOnly = elements.jsonOnlyFilter.checked;
    updateRequestCount();
    renderRequests();
}

// Update request count display
function updateRequestCount() {
    if (state.requests.length === 0) {
        elements.totalRequests.textContent = '0';
        return;
    }
    
    if (state.showJsonOnly) {
        const jsonCount = state.requests.filter(req => isJsonResponse(req)).length;
        elements.totalRequests.textContent = `${jsonCount} / ${state.requests.length}`;
    } else {
        elements.totalRequests.textContent = state.requests.length;
    }
}

// Render Requests
function renderRequests() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const filteredRequests = state.requests.filter(req => {
        // Apply JSON filter
        if (state.showJsonOnly && !isJsonResponse(req)) {
            return false;
        }
        
        // Apply search filter
        if (!searchTerm) return true;
        const url = (req.url || '').toLowerCase();
        const method = (req.method || '').toLowerCase();
        return url.includes(searchTerm) || method.includes(searchTerm);
    });
    
    if (filteredRequests.length === 0) {
        let message = 'No requests captured yet. Start recording to begin capturing network traffic.';
        
        if (state.requests.length > 0) {
            if (state.showJsonOnly && elements.searchInput.value) {
                message = 'No JSON API requests match your search criteria.';
            } else if (state.showJsonOnly) {
                message = 'No JSON API requests found. Try unchecking "JSON APIs Only" to see all requests.';
            } else if (elements.searchInput.value) {
                message = 'No requests match your search criteria.';
            }
        }
        
        elements.requestsTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7" class="empty-message">
                    ${message}
                </td>
            </tr>
        `;
        return;
    }
    
    elements.requestsTableBody.innerHTML = filteredRequests.map((req, index) => {
        const time = req.createdAt ? new Date(req.createdAt).toLocaleTimeString() : '-';
        const method = req.method || 'GET';
        const url = req.url || '-';
        const status = req.status || '-';
        const type = req.resourceType || 'other';
        const size = req.bodySize ? formatSize(req.bodySize) : '-';
        
        return `
            <tr data-request-id="${req.id || index}" class="request-row">
                <td>${time}</td>
                <td><span class="method-badge ${method.toLowerCase()}">${method}</span></td>
                <td class="url-cell" title="${url}">${url}</td>
                <td>${renderStatus(status)}</td>
                <td>${type}</td>
                <td>${size}</td>
                <td>
                    <button class="btn btn-secondary" onclick="viewRequestDetails(${index})" style="padding: 6px 12px; font-size: 0.85rem;">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderStatus(status) {
    if (status === '-') return status;
    
    const statusNum = parseInt(status);
    let className = 'status-code';
    
    if (statusNum >= 200 && statusNum < 300) {
        className += ' success';
    } else if (statusNum >= 300 && statusNum < 400) {
        className += ' redirect';
    } else if (statusNum >= 400 && statusNum < 500) {
        className += ' client-error';
    } else if (statusNum >= 500) {
        className += ' server-error';
    } else {
        className += ' error';
    }
    
    return `<span class="${className}">${status}</span>`;
}

function highlightNewRequests(previousCount) {
    const rows = elements.requestsTableBody.querySelectorAll('tr.request-row');
    const newRows = Array.from(rows).slice(0, state.requests.length - previousCount);
    
    newRows.forEach(row => {
        row.classList.add('new-request');
        setTimeout(() => {
            row.classList.remove('new-request');
        }, 2000);
    });
}

// View Request Details
function viewRequestDetails(index) {
    const request = state.requests[index];
    if (!request) return;
    
    // Store current request for curl generation
    elements.requestModal.dataset.requestIndex = index;
    
    elements.modalTitle.textContent = `${request.method || 'GET'} ${request.url || ''}`;
    
    // Headers tab
    const requestHeaders = request.requestHeaders || {};
    const responseHeaders = request.responseHeaders || {};
    document.getElementById('requestHeaders').textContent = 
        Object.keys(requestHeaders).length > 0 
            ? JSON.stringify(requestHeaders, null, 2)
            : 'No request headers available';
    document.getElementById('responseHeaders').textContent = 
        Object.keys(responseHeaders).length > 0
            ? JSON.stringify(responseHeaders, null, 2)
            : 'No response headers available';
    
    // Payload tab
    const payload = request.postData || null;
    document.getElementById('payloadContent').textContent = 
        payload ? payload : 'No payload data available';
    
    // Preview tab
    const preview = request.preview || null;
    if (preview && preview.formatted) {
        document.getElementById('previewContent').textContent = preview.formatted;
    } else {
        document.getElementById('previewContent').textContent = 'No preview available';
    }
    
    // Response tab
    const response = request.body || null;
    document.getElementById('responseContent').textContent = 
        response ? response : 'No response body available';
    
    // Show modal
    elements.requestModal.classList.add('show');
    switchTab('headers');
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tabName}Tab`);
    });
}

// Close Modal
function closeModal() {
    elements.requestModal.classList.remove('show');
}

// Filter Requests
function filterRequests() {
    renderRequests();
}

// Clear Requests
function clearRequests() {
    if (confirm('Are you sure you want to clear the request list? This will not delete recorded data.')) {
        state.requests = [];
        renderRequests();
        elements.searchInput.value = '';
        elements.jsonOnlyFilter.checked = false;
        state.showJsonOnly = false;
    }
}

// Update Filters
async function updateFilters() {
    const newFilters = {
        headers: elements.filterHeaders.checked,
        payload: elements.filterPayload.checked,
        preview: elements.filterPreview.checked,
        response: elements.filterResponse.checked
    };
    
    state.filters = newFilters;
    saveFilters();
    
    // Update filters on server if session is active
    if (state.currentSessionId && state.isRecording) {
        try {
            await fetch(`${API_BASE}/api/sessions/${state.currentSessionId}/filters`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newFilters)
            });
        } catch (error) {
            console.error('Error updating filters:', error);
        }
    }
}

// Load Filters
function loadFilters() {
    const saved = localStorage.getItem('apiRecorderFilters');
    if (saved) {
        try {
            const filters = JSON.parse(saved);
            state.filters = filters;
            elements.filterHeaders.checked = filters.headers !== false;
            elements.filterPayload.checked = filters.payload !== false;
            elements.filterPreview.checked = filters.preview !== false;
            elements.filterResponse.checked = filters.response !== false;
        } catch (e) {
            console.error('Error loading filters:', e);
        }
    }
}

// Save Filters
function saveFilters() {
    localStorage.setItem('apiRecorderFilters', JSON.stringify(state.filters));
}

// Check Existing Sessions
async function checkExistingSessions() {
    try {
        const response = await fetch(`${API_BASE}/api/sessions`);
        if (!response.ok) {
            // If API is not available, ensure UI is in correct initial state
            console.warn('Could not fetch sessions, starting with default state');
            return;
        }
        
        const sessions = await response.json();
        const activeSession = sessions.find(s => s.status === 'active');
        
        if (activeSession) {
            state.currentSessionId = activeSession.sessionId;
            state.isRecording = true;
            elements.startBtn.disabled = true;
            elements.stopBtn.disabled = false;
            elements.targetUrl.disabled = true;
            elements.sessionInfo.style.display = 'flex';
            elements.sessionName.textContent = activeSession.name;
            elements.statusIndicator.className = 'status-indicator recording';
            elements.recordingStatus.textContent = 'Recording';
            elements.recordingStatus.style.color = 'var(--danger-color)';
            
            // Load filters
            if (activeSession.metadata && activeSession.metadata.filters) {
                state.filters = activeSession.metadata.filters;
                elements.filterHeaders.checked = state.filters.headers !== false;
                elements.filterPayload.checked = state.filters.payload !== false;
                elements.filterPreview.checked = state.filters.preview !== false;
                elements.filterResponse.checked = state.filters.response !== false;
            }
            
            startPolling();
        } else {
            // No active session - ensure UI is in correct state for starting new recording
            elements.startBtn.disabled = false;
            elements.stopBtn.disabled = true;
            elements.targetUrl.disabled = false;
            elements.sessionInfo.style.display = 'none';
            elements.recordingStatus.textContent = 'Idle';
            elements.recordingStatus.style.color = 'var(--text-secondary)';
            elements.statusIndicator.className = 'status-indicator idle';
        }
    } catch (error) {
        console.error('Error checking sessions:', error);
        // On error, ensure UI is in correct initial state
        elements.startBtn.disabled = false;
        elements.stopBtn.disabled = true;
        elements.targetUrl.disabled = false;
    }
}

// Utility Functions
function formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Handle Reset
async function handleReset() {
    if (confirm('Reset the UI state? This will clear the current session state and allow you to start fresh.')) {
        // Try to stop current session if active
        if (state.currentSessionId && state.isRecording) {
            try {
                await fetch(`${API_BASE}/api/sessions/${state.currentSessionId}/stop`, {
                    method: 'POST'
                });
            } catch (e) {
                // Ignore errors - we're resetting anyway
                console.warn('Error stopping session during reset:', e);
            }
        }
        
        // Reset everything
        resetUI();
        state.requests = [];
        renderRequests();
        elements.searchInput.value = '';
    }
}

// Generate cURL command from request
function generateCurlCommand(request) {
    if (!request) return '';
    
    const method = (request.method || 'GET').toUpperCase();
    const url = request.url || '';
    const headers = request.requestHeaders || {};
    const postData = request.postData || null;
    
    let curl = `curl -X ${method}`;
    
    // Add headers (exclude some browser-specific headers that aren't needed for replay)
    // NOTE: 'cookie' is NOT excluded - cookies are automatically included if present
    const excludeHeaders = ['host', 'connection', 'content-length', 'accept-encoding', 'referer'];
    const headerEntries = Object.entries(headers).filter(([key]) => 
        !excludeHeaders.includes(key.toLowerCase())
    );
    
    for (const [key, value] of headerEntries) {
        // Escape single quotes in header values
        const escapedValue = String(value).replace(/'/g, "'\\''");
        curl += ` \\\n  -H '${key}: ${escapedValue}'`;
    }
    
    // Add data for POST, PUT, PATCH requests
    if (postData && ['POST', 'PUT', 'PATCH'].includes(method)) {
        // Check if it's JSON
        let data = postData;
        try {
            const parsed = JSON.parse(postData);
            data = JSON.stringify(parsed);
        } catch (e) {
            // Not JSON, use as-is
        }
        
        // Escape single quotes
        const escapedData = data.replace(/'/g, "'\\''");
        curl += ` \\\n  -d '${escapedData}'`;
    }
    
    // Add URL at the end
    curl += ` \\\n  '${url}'`;
    
    return curl;
}

// Copy as cURL
async function copyAsCurl() {
    const requestIndex = elements.requestModal.dataset.requestIndex;
    if (requestIndex === undefined) return;
    
    const request = state.requests[parseInt(requestIndex)];
    if (!request) return;
    
    const curlCommand = generateCurlCommand(request);
    
    try {
        await navigator.clipboard.writeText(curlCommand);
        
        // Show feedback
        const originalText = elements.copyCurlBtn.innerHTML;
        elements.copyCurlBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
        elements.copyCurlBtn.style.backgroundColor = 'var(--success-color)';
        
        setTimeout(() => {
            elements.copyCurlBtn.innerHTML = originalText;
            elements.copyCurlBtn.style.backgroundColor = '';
        }, 2000);
    } catch (error) {
        // Fallback for browsers that don't support clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = curlCommand;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert('cURL command copied to clipboard!');
        } catch (e) {
            // Show in a prompt as last resort
            prompt('Copy this cURL command:', curlCommand);
        }
        document.body.removeChild(textarea);
    }
}

// Make viewRequestDetails available globally
window.viewRequestDetails = viewRequestDetails;

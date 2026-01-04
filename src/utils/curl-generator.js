/**
 * cURL Command Generator
 * Generates curl commands from captured request data
 */

/**
 * Generate a curl command from request data
 * @param {Object} request - Request data object
 * @param {Object} options - Generation options
 * @returns {string} - cURL command string
 */
export function generateCurl(request, options = {}) {
  if (!request) {
    throw new Error('Request data is required');
  }

  const {
    method = 'GET',
    url = '',
    headers = {},
    postData = null,
    queryString = null
  } = request;

  const {
    // Note: 'cookie' is NOT in excludeHeaders - cookies are automatically included if present
    excludeHeaders = ['host', 'connection', 'content-length', 'accept-encoding', 'referer'],
    includeAllHeaders = false,
    pretty = true
  } = options;

  const httpMethod = method.toUpperCase();
  let curl = `curl -X ${httpMethod}`;

  // Build URL with query string if present
  let fullUrl = url;
  if (queryString && !url.includes('?')) {
    fullUrl += `?${queryString}`;
  }

  // Add headers
  const headerEntries = Object.entries(headers);
  const filteredHeaders = includeAllHeaders
    ? headerEntries
    : headerEntries.filter(([key]) => 
        !excludeHeaders.includes(key.toLowerCase())
      );

  for (const [key, value] of filteredHeaders) {
    const escapedValue = escapeShellValue(String(value));
    if (pretty) {
      curl += ` \\\n  -H '${key}: ${escapedValue}'`;
    } else {
      curl += ` -H '${key}: ${escapedValue}'`;
    }
  }

  // Add data for POST, PUT, PATCH, DELETE requests
  if (postData && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(httpMethod)) {
    let data = postData;
    
    // Try to format JSON if it's valid JSON
    try {
      const parsed = JSON.parse(postData);
      data = JSON.stringify(parsed, null, pretty ? 2 : 0);
    } catch (e) {
      // Not JSON, use as-is
    }

    const escapedData = escapeShellValue(data);
    if (pretty) {
      curl += ` \\\n  -d '${escapedData}'`;
    } else {
      curl += ` -d '${escapedData}'`;
    }
  }

  // Add URL at the end
  const escapedUrl = escapeShellValue(fullUrl);
  if (pretty) {
    curl += ` \\\n  '${escapedUrl}'`;
  } else {
    curl += ` '${escapedUrl}'`;
  }

  return curl;
}

/**
 * Escape shell value (handle single quotes)
 * @param {string} value - Value to escape
 * @returns {string} - Escaped value
 */
function escapeShellValue(value) {
  // Replace single quotes with '\''
  return value.replace(/'/g, "'\\''");
}

/**
 * Generate curl command with verbose output
 * @param {Object} request - Request data object
 * @returns {string} - cURL command with verbose flag
 */
export function generateCurlVerbose(request) {
  const curl = generateCurl(request);
  return curl.replace('curl -X', 'curl -v -X');
}

/**
 * Generate curl command with output to file
 * @param {Object} request - Request data object
 * @param {string} outputFile - Output file path
 * @returns {string} - cURL command with output flag
 */
export function generateCurlWithOutput(request, outputFile = 'response.json') {
  const curl = generateCurl(request);
  return `${curl} -o ${outputFile}`;
}

/**
 * Generate curl command with follow redirects
 * @param {Object} request - Request data object
 * @returns {string} - cURL command with follow redirects
 */
export function generateCurlWithRedirects(request) {
  const curl = generateCurl(request);
  return curl.replace('curl -X', 'curl -L -X');
}

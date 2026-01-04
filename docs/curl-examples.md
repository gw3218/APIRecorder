# cURL Command Generation Examples

The API Recorder can generate cURL commands from captured requests, allowing you to easily replay requests.

## Example 1: Simple GET Request

**Captured Request:**
- Method: GET
- URL: `https://api.example.com/users`
- Headers:
  - `Authorization: Bearer token123`
  - `Accept: application/json`

**Generated cURL:**
```bash
curl -X GET \
  -H 'Authorization: Bearer token123' \
  -H 'Accept: application/json' \
  'https://api.example.com/users'
```

## Example 2: POST Request with JSON Body

**Captured Request:**
- Method: POST
- URL: `https://api.example.com/users`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer token123`
- Body:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```

**Generated cURL:**
```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token123' \
  -d '{
  "name": "John Doe",
  "email": "john@example.com"
}' \
  'https://api.example.com/users'
```

## Example 3: POST Request with Form Data

**Captured Request:**
- Method: POST
- URL: `https://api.example.com/login`
- Headers:
  - `Content-Type: application/x-www-form-urlencoded`
- Body: `username=john&password=secret123`

**Generated cURL:**
```bash
curl -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=john&password=secret123' \
  'https://api.example.com/login'
```

## Example 4: GET Request with Query Parameters

**Captured Request:**
- Method: GET
- URL: `https://api.example.com/search`
- Query String: `q=test&limit=10&offset=0`
- Headers:
  - `Accept: application/json`

**Generated cURL:**
```bash
curl -X GET \
  -H 'Accept: application/json' \
  'https://api.example.com/search?q=test&limit=10&offset=0'
```

## Example 5: PUT Request with JSON Body

**Captured Request:**
- Method: PUT
- URL: `https://api.example.com/users/123`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer token123`
  - `If-Match: "etag-value"`
- Body:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
  ```

**Generated cURL:**
```bash
curl -X PUT \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token123' \
  -H 'If-Match: "etag-value"' \
  -d '{
  "name": "Jane Doe",
  "email": "jane@example.com"
}' \
  'https://api.example.com/users/123'
```

## Using the Generated cURL Commands

### Basic Usage
1. Open a request in the UI
2. Click "Copy as cURL" button
3. Paste into your terminal and run

### With Verbose Output
Add `-v` flag to see detailed request/response information:
```bash
curl -v -X GET \
  -H 'Authorization: Bearer token123' \
  'https://api.example.com/users'
```

### Save Response to File
```bash
curl -X GET \
  -H 'Authorization: Bearer token123' \
  'https://api.example.com/users' \
  -o response.json
```

### Follow Redirects
```bash
curl -L -X GET \
  -H 'Authorization: Bearer token123' \
  'https://api.example.com/users'
```

### Include All Headers
By default, some browser-specific headers are excluded (host, connection, content-length, etc.). To include all headers, you can manually edit the generated command or modify the generator options.

## Notes

- **Authentication**: Bearer tokens and API keys in headers are preserved
- **Cookies**: Cookie headers are automatically included if they were sent in the original request. The `Cookie` header is NOT filtered out, so all cookies from the captured request will be in the generated cURL command.
- **Content-Type**: Automatically preserved for POST/PUT requests
- **Query Parameters**: Included in the URL
- **Special Characters**: Properly escaped for shell execution
- **JSON Formatting**: Automatically formatted for readability

## About Cookies

**Do you need cookies?** It depends on the API:

1. **If the original request had cookies**: They are automatically included in the generated cURL command. You don't need to add them manually.

2. **If the request didn't have cookies**: You may need to add them if the API requires authentication via cookies.

3. **Cookie expiration**: If cookies have expired, you may need to:
   - Re-record the request to get fresh cookies
   - Manually update the cookie value in the cURL command
   - Use a cookie jar: `curl -c cookies.txt -b cookies.txt ...`

### Example with Cookies

If your captured request had a Cookie header like:
```
Cookie: sessionId=abc123; csrfToken=xyz789
```

The generated cURL will automatically include it:
```bash
curl -X GET \
  -H 'Cookie: sessionId=abc123; csrfToken=xyz789' \
  -H 'Authorization: Bearer token123' \
  'https://api.example.com/users'
```

### Using Cookie Jars (Advanced)

For better cookie management, you can use curl's cookie jar feature:

```bash
# Save cookies from a login request
curl -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  -d '{"username":"user","password":"pass"}' \
  'https://api.example.com/login'

# Use saved cookies for subsequent requests
curl -b cookies.txt -X GET \
  'https://api.example.com/users'
```

## Programmatic Usage

You can also generate cURL commands programmatically:

```javascript
import { generateCurl } from './src/utils/curl-generator.js';

const request = {
  method: 'POST',
  url: 'https://api.example.com/users',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  postData: JSON.stringify({ name: 'John Doe' })
};

const curlCommand = generateCurl(request);
console.log(curlCommand);
```

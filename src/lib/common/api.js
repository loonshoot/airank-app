// src/lib/common/api.js
const api = async (url, options = {}) => {
  const { body, headers, ...opts } = options || {}; // Add default value for options
  const requestBody = JSON.stringify(body);
  const response = await fetch(url, {
    body: requestBody,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...opts,
  });
  const result = await response.json();
  return { status: response.status, ...result, url };
};

export default api;

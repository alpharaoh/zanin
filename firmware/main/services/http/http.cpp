#include "http.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include <cstdio>
#include <cstring>
#include <sys/stat.h>

static const char *TAG = "http-client";

// Static member initialization
int HttpClient::lastStatusCode_ = 0;

// Boundary for multipart form data
static const char *BOUNDARY = "----ESP32FormBoundary7MA4YWxkTrZu0gW";

esp_err_t HttpClient::get(const char *url, char *responseBuffer,
                          size_t bufferSize) {
  esp_http_client_config_t config = {};
  config.url = url;
  config.timeout_ms = 10000;

  esp_http_client_handle_t client = esp_http_client_init(&config);
  if (client == NULL) {
    ESP_LOGE(TAG, "Failed to initialize HTTP client");
    return ESP_FAIL;
  }

  esp_err_t err = esp_http_client_open(client, 0);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open HTTP connection: %s", esp_err_to_name(err));
    esp_http_client_cleanup(client);
    return err;
  }

  int content_length = esp_http_client_fetch_headers(client);
  lastStatusCode_ = esp_http_client_get_status_code(client);
  ESP_LOGI(TAG, "HTTP GET Status = %d, content_length = %d", lastStatusCode_,
           content_length);

  int read_len = esp_http_client_read(client, responseBuffer, bufferSize - 1);
  if (read_len >= 0) {
    responseBuffer[read_len] = '\0';
    ESP_LOGI(TAG, "Response: %s", responseBuffer);
  }
  else {
    ESP_LOGE(TAG, "Failed to read HTTP response");
    err = ESP_FAIL;
  }

  esp_http_client_close(client);
  esp_http_client_cleanup(client);

  return err;
}

esp_err_t HttpClient::post(const char *url, const char *postData,
                           char *responseBuffer, size_t bufferSize) {
  esp_http_client_config_t config = {};
  config.url = url;
  config.timeout_ms = 10000;
  config.method = HTTP_METHOD_POST;

  esp_http_client_handle_t client = esp_http_client_init(&config);
  if (client == NULL) {
    ESP_LOGE(TAG, "Failed to initialize HTTP client");
    return ESP_FAIL;
  }

  esp_http_client_set_header(client, "Content-Type", "application/json");
  esp_http_client_set_post_field(client, postData, strlen(postData));

  esp_err_t err = esp_http_client_perform(client);
  if (err == ESP_OK) {
    lastStatusCode_ = esp_http_client_get_status_code(client);
    int content_length = esp_http_client_get_content_length(client);
    ESP_LOGI(TAG, "HTTP POST Status = %d, content_length = %d", lastStatusCode_,
             content_length);

    int read_len =
        esp_http_client_read(client, responseBuffer, bufferSize - 1);
    if (read_len >= 0) {
      responseBuffer[read_len] = '\0';
    }
  }
  else {
    ESP_LOGE(TAG, "HTTP POST failed: %s", esp_err_to_name(err));
  }

  esp_http_client_cleanup(client);
  return err;
}

esp_err_t HttpClient::uploadFile(const char *url, const char *filePath,
                                 const char *fieldName, char *responseBuffer,
                                 size_t bufferSize) {
  // Get file size
  struct stat fileStat;
  if (stat(filePath, &fileStat) != 0) {
    ESP_LOGE(TAG, "Failed to stat file: %s", filePath);
    return ESP_FAIL;
  }
  size_t fileSize = fileStat.st_size;

  // Open the file
  FILE *f = fopen(filePath, "rb");
  if (f == NULL) {
    ESP_LOGE(TAG, "Failed to open file: %s", filePath);
    return ESP_FAIL;
  }

  // Extract filename from path
  const char *filename = strrchr(filePath, '/');
  if (filename) {
    filename++; // Skip the '/'
  }
  else {
    filename = filePath;
  }

  // Determine content type based on file extension
  const char *contentType = "application/octet-stream";
  if (strstr(filename, ".wav") != NULL) {
    contentType = "audio/wav";
  }
  else if (strstr(filename, ".mp3") != NULL) {
    contentType = "audio/mpeg";
  }

  // Build multipart header
  char header[512];
  int headerLen =
      snprintf(header, sizeof(header),
               "--%s\r\n"
               "Content-Disposition: form-data; name=\"%s\"; filename=\"%s\"\r\n"
               "Content-Type: %s\r\n\r\n",
               BOUNDARY, fieldName, filename, contentType);

  // Build multipart footer
  char footer[64];
  int footerLen = snprintf(footer, sizeof(footer), "\r\n--%s--\r\n", BOUNDARY);

  // Calculate total content length
  size_t totalLen = headerLen + fileSize + footerLen;

  // Configure HTTP client
  esp_http_client_config_t config = {};
  config.url = url;
  config.timeout_ms = 60000; // 60 seconds for file upload
  config.method = HTTP_METHOD_POST;

  esp_http_client_handle_t client = esp_http_client_init(&config);
  if (client == NULL) {
    ESP_LOGE(TAG, "Failed to initialize HTTP client");
    fclose(f);
    return ESP_FAIL;
  }

  // Set headers
  char contentTypeHeader[128];
  snprintf(contentTypeHeader, sizeof(contentTypeHeader),
           "multipart/form-data; boundary=%s", BOUNDARY);
  esp_http_client_set_header(client, "Content-Type", contentTypeHeader);

  // Open connection with content length
  esp_err_t err = esp_http_client_open(client, totalLen);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to open HTTP connection: %s", esp_err_to_name(err));
    esp_http_client_cleanup(client);
    fclose(f);
    return err;
  }

  // Write multipart header
  int written = esp_http_client_write(client, header, headerLen);
  if (written < 0) {
    ESP_LOGE(TAG, "Failed to write header");
    esp_http_client_cleanup(client);
    fclose(f);
    return ESP_FAIL;
  }

  // Write file content in chunks
  static const size_t CHUNK_SIZE = 4096;
  char *chunk = new char[CHUNK_SIZE];
  size_t bytesRead;
  size_t totalWritten = 0;

  while ((bytesRead = fread(chunk, 1, CHUNK_SIZE, f)) > 0) {
    written = esp_http_client_write(client, chunk, bytesRead);
    if (written < 0) {
      ESP_LOGE(TAG, "Failed to write file chunk");
      delete[] chunk;
      esp_http_client_cleanup(client);
      fclose(f);
      return ESP_FAIL;
    }
    totalWritten += written;

    // Log progress for large files
    if (totalWritten % (64 * 1024) == 0) {
      ESP_LOGI(TAG, "Upload progress: %zu / %zu bytes", totalWritten, fileSize);
    }
  }

  delete[] chunk;
  fclose(f);

  ESP_LOGI(TAG, "File content written: %zu bytes", totalWritten);

  // Write multipart footer
  written = esp_http_client_write(client, footer, footerLen);
  if (written < 0) {
    ESP_LOGE(TAG, "Failed to write footer");
    esp_http_client_cleanup(client);
    return ESP_FAIL;
  }

  // Fetch response
  int content_length = esp_http_client_fetch_headers(client);
  lastStatusCode_ = esp_http_client_get_status_code(client);
  ESP_LOGI(TAG, "Upload complete. Status = %d, content_length = %d",
           lastStatusCode_, content_length);

  // Read response body
  int read_len = esp_http_client_read(client, responseBuffer, bufferSize - 1);
  if (read_len >= 0) {
    responseBuffer[read_len] = '\0';
    ESP_LOGI(TAG, "Response: %s", responseBuffer);
  }

  esp_http_client_close(client);
  esp_http_client_cleanup(client);

  // Consider 2xx status codes as success
  if (lastStatusCode_ >= 200 && lastStatusCode_ < 300) {
    return ESP_OK;
  }

  return ESP_FAIL;
}

int HttpClient::getLastStatusCode() { return lastStatusCode_; }

#pragma once

#include "esp_err.h"
#include <cstddef>

class HttpClient {
public:
  /**
   * Perform an HTTP GET request
   * @param url The URL to fetch
   * @param responseBuffer Buffer to store the response
   * @param bufferSize Size of the response buffer
   * @return ESP_OK on success, error code otherwise
   */
  static esp_err_t get(const char *url, char *responseBuffer,
                       size_t bufferSize);

  /**
   * Perform an HTTP POST request with JSON body
   * @param url The URL to post to
   * @param postData The JSON data to send
   * @param responseBuffer Buffer to store the response
   * @param bufferSize Size of the response buffer
   * @return ESP_OK on success, error code otherwise
   */
  static esp_err_t post(const char *url, const char *postData,
                        char *responseBuffer, size_t bufferSize);

  /**
   * Upload a file using multipart/form-data
   * @param url The URL to upload to
   * @param filePath Path to the file on SD card
   * @param fieldName The form field name for the file (e.g., "audio")
   * @param responseBuffer Buffer to store the response
   * @param bufferSize Size of the response buffer
   * @return ESP_OK on success, error code otherwise
   */
  static esp_err_t uploadFile(const char *url, const char *filePath,
                              const char *fieldName, char *responseBuffer,
                              size_t bufferSize);

  /**
   * Get the HTTP status code from the last request
   */
  static int getLastStatusCode();

private:
  static int lastStatusCode_;
};

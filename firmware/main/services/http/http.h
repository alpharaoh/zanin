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
   * Perform an HTTP POST request
   * @param url The URL to post to
   * @param postData The data to send
   * @param responseBuffer Buffer to store the response
   * @param bufferSize Size of the response buffer
   * @return ESP_OK on success, error code otherwise
   */
  static esp_err_t post(const char *url, const char *postData,
                        char *responseBuffer, size_t bufferSize);
};

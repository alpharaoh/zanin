#include "http.h"
#include "esp_http_client.h"
#include "esp_log.h"

static const char *TAG = "http-client";

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
  int status_code = esp_http_client_get_status_code(client);
  ESP_LOGI(TAG, "HTTP GET Status = %d, content_length = %d", status_code,
           content_length);

  int read_len = esp_http_client_read(client, responseBuffer, bufferSize - 1);
  if (read_len >= 0) {
    responseBuffer[read_len] = '\0';
    ESP_LOGI(TAG, "Response: %s", responseBuffer);
  } else {
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
    int status_code = esp_http_client_get_status_code(client);
    int content_length = esp_http_client_get_content_length(client);
    ESP_LOGI(TAG, "HTTP POST Status = %d, content_length = %d", status_code,
             content_length);

    int read_len = esp_http_client_read(client, responseBuffer, bufferSize - 1);
    if (read_len >= 0) {
      responseBuffer[read_len] = '\0';
    }
  } else {
    ESP_LOGE(TAG, "HTTP POST failed: %s", esp_err_to_name(err));
  }

  esp_http_client_cleanup(client);
  return err;
}

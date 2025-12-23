#include <iostream>
#include <stdio.h>

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

extern "C" void app_main(void) {
  std::cout << "Hello from ESP32-S3!" << std::endl;
}

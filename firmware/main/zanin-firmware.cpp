#include <iostream>
#include <stdio.h>

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

extern "C" void app_main(void) {
  char *p = pcTaskGetName(NULL);
  std::cout << "This is very cool!\n" << p << std::endl;
}

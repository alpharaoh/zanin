#pragma once

#include "driver/sdspi_host.h"
#include "esp_err.h"
#include "sdmmc_cmd.h"
#include "soc/gpio_num.h"
#include <string>

constexpr const char *MOUNT_POINT = "/sdcard";

class SDCard {
public:
  SDCard(gpio_num_t misoGPIO, gpio_num_t clkGPIO, gpio_num_t mosiGPIO,
         gpio_num_t csGPIO);

  bool isMounted() const { return mounted; }
  const char *getMountPoint() const { return MOUNT_POINT; }

  void unmount();
  esp_err_t write(const char *path, const char *data);
  esp_err_t read(const char *path, char *buffer, size_t bufferSize);

private:
  gpio_num_t misoGPIO; // DO - Data Out from SD card
  gpio_num_t clkGPIO;
  gpio_num_t mosiGPIO; // DI - Data In to SD card
  gpio_num_t csGPIO;
  sdmmc_card_t *card = nullptr;
  sdmmc_host_t host = SDSPI_HOST_DEFAULT();
  bool mounted = false;
};

#include "led_strip.h"

class Led {
public:
  Led(int gpio);
  void setColor(int r, int g, int b);
  void turnOff();
  bool isOn();

private:
  int gpio;
  bool ledOn;
  led_strip_handle_t ledStrip;
};

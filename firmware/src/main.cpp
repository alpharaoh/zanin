#include "main.h"
#include <iostream>

ControlLoop::ControlLoop() : count(0), state(ControlLoopState::Idle) {}

void ControlLoop::run() { count++; }

int ControlLoop::getCount() { return count; }

int main() {
  ControlLoop loop;

  while (true) {
    std::cout << "Count: " << loop.getCount() << std::endl;

    std::string word;
    std::cin >> word;

    loop.run();
  };

  return 0;
};

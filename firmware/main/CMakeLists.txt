file(GLOB_RECURSE COMPONENT_SRCS "components/**/*.cpp")

idf_component_register(SRCS "zanin-firmware.cpp"
                            ${COMPONENT_SRCS}
                    INCLUDE_DIRS ".")

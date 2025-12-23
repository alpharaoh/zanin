import { env } from "@zanin/env/client";
import Axios, { AxiosError, type AxiosRequestConfig } from "axios";

export const AXIOS_INSTANCE = Axios.create({
  baseURL: env.PUBLIC_SERVER_BASE_URL,
  withCredentials: true, // Send cookies with cross-origin requests
});

// API response envelope type
interface ApiEnvelope<T> {
  data: T;
  error: null | { message: string };
}

export const axios = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => {
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
  }).then(({ data }) => {
    // Unwrap API envelope format { data: T, error: null }
    if (data && typeof data === "object" && "data" in data && "error" in data) {
      return (data as ApiEnvelope<T>).data;
    }
    return data;
  });

  return promise;
};

// In some case with react-query and swr you want to be able to override the return error type so you can also do it here like this
export type ErrorType<Error> = AxiosError<Error>;

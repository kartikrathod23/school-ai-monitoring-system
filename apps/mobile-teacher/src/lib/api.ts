import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
console.log("API URL:", API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
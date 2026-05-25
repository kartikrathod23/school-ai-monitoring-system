import dotenv from "dotenv";

dotenv.config();

import "./workers/onboarding.worker";

console.log(
  "ML Worker Running..."
);
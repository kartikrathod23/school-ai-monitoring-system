import dotenv from "dotenv";

dotenv.config();

import "./workers/ml.worker";

console.log(
  "ML Worker Running..."
);
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const minDonation = hre.ethers.parseEther("0.001");
  const maxDonation = hre.ethers.parseEther("1.0");

  
  const Auctions = await hre.ethers.getContractFactory("Auctions");
  const auctions = await Auctions.deploy(minDonation, maxDonation);
  await auctions.waitForDeployment();

  const address = await auctions.getAddress();
  console.log("Auctions deployed to:", address);

  const artifact = await hre.artifacts.readArtifact("Auctions");
  const config = { address, abi: artifact.abi };

  const outPath = path.resolve(__dirname, "..", "..", "web", "wwwroot", "contractConfig.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("Wrote config to:", outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });


fetch("https://row-huh.vercel.app/api/auctions")
  .then(res => res.json())
  .then(data => {
    const fs = require("fs");
    fs.writeFileSync("auctions.json", JSON.stringify(data, null, 2));
    console.log("Saved to auctions.json");
  });

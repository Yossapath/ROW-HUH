fetch("https://row-huh.vercel.app/api/check-roster")
  .then(res => res.json())
  .then(data => {
    const fs = require("fs");
    fs.writeFileSync("roster_check_result.json", JSON.stringify(data, null, 2));
    console.log("Saved to roster_check_result.json");
  });

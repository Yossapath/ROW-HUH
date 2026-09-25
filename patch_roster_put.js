const fs = require('fs');
let code = fs.readFileSync('app/api/roster/member/route.ts', 'utf8');

if (!code.includes('import { signToken, authCookie } from "@/lib/auth"')) {
    code = code.replace(
        'import { requireAuth } from "@/lib/auth";',
        'import { requireAuth, signToken, authCookie } from "@/lib/auth";'
    );
}

const targetReturnStr = 'return ok({ success: true });';
const replacementReturnStr = `
    let response = ok({ success: true });
    // If the user updated their own profile, issue a new JWT token to reflect changes immediately
    if (user.discordId === targetDiscordId) {
      const newToken = await signToken({
        ...user,
        gameUsername: name,
        class: job,
        power: Number(power),
        gvgField: gvgField || user.gvgField
      });
      response.cookies.set(authCookie(newToken));
    }
    return response;
`;
code = code.replace(targetReturnStr, replacementReturnStr);

fs.writeFileSync('app/api/roster/member/route.ts', code);
console.log("Patched roster member route");

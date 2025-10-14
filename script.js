const formations = {
    "Offense 1": ["Off", "Off", "Off", "Off", "Off", "Sup"],
    "Offense 2": ["Off", "Off", "Off", "Off", "Off", "Def"],
    "Offense 3": ["Off", "Off", "Off", "Off", "Sup", "Sup"],
    "Offense 4": ["Off", "Off", "Off", "Off", "Def", "Def"],
    "Offense 5": ["Off", "Off", "Off", "Def", "Def", "Sup"],
    "Offense 6": ["Off", "Off", "Off", "Def", "Sup", "Sup"],
    "Offense 7": ["Off", "Off", "Off", "Off", "Sup", "Def"],
    "Neutral 1": ["Sup", "Sup", "Sup", "Sup", "Sup", "Sup"],
    "Neutral 2": ["Sup", "Sup", "Sup", "Sup", "Def", "Off"],
    "Neutral 3": ["Sup", "Sup", "Sup", "Def", "Def", "Off"],
    "Neutral 4": ["Sup", "Sup", "Sup", "Off", "Off", "Def"],
    "Neutral 5": ["Sup", "Sup", "Off", "Off", "Def", "Def"],
    "Neutral 6": ["Sup", "Sup", "Sup", "Sup", "Sup", "Def"],
    "Neutral 7": ["Sup", "Sup", "Sup", "Sup", "Sup", "Off"],
    "Defense 1": ["Def", "Def", "Def", "Def", "Sup", "Sup"],
    "Defense 2": ["Def", "Def", "Def", "Def", "Off", "Off"],
    "Defense 3": ["Def", "Def", "Def", "Def", "Def", "Off"],
    "Defense 4": ["Def", "Def", "Def", "Def", "Def", "Sup"],
    "Defense 5": ["Off", "Off", "Def", "Def", "Def", "Sup"],
    "Defense 6": ["Off", "Sup", "Def", "Def", "Def", "Def"],
    "Defense 7": ["Off", "Sup", "Sup", "Def", "Def", "Def"],
};

function parseLine(line) {
    const parts = line
        .trim()
        .split(/\t|\||,/)
        .map((p) => p.trim())
        .filter((p) => p.length);
    if (parts.length < 3) return null;
    let id = "";
    if (parts.length >= 4) id = parts[3];
    else id = parts[parts.length - 1];
    const role = parts.find((p) => /off|def|sup/i.test(p)) || parts[2] || "";
    const name = parts[0];
    return { name, role, id };
}

function normalizeRole(r) {
    if (!r) return "";
    r = r.toLowerCase();
    if (r.includes("off")) return "Off";
    if (r.includes("def")) return "Def";
    if (r.includes("sup")) return "Sup";
    return "";
}

function findFormation(counts) {
    for (const [name, pattern] of Object.entries(formations)) {
        const cOff = pattern.filter((x) => x === "Off").length;
        const cDef = pattern.filter((x) => x === "Def").length;
        const cSup = pattern.filter((x) => x === "Sup").length;
        if (cOff === counts.Off && cDef === counts.Def && cSup === counts.Sup) return { name, pattern };
    }
    return null;
}

function buildCommand(order, pattern) {
    const ids = [];
    const pools = { Off: [], Def: [], Sup: [] };
    for (const h of order) {
        const nr = normalizeRole(h.role);
        if (nr && h.id) pools[nr].push(h);
    }
    for (const role of pattern) {
        const pool = pools[role];
        if (!pool || pool.length === 0) return { error: `No heroes left for role ${role}` };
        const hero = pool.shift();
        ids.push(hero.id);
    }
    return { ids };
}

document.getElementById("run").addEventListener("click", () => {
    const raw = document.getElementById("input").value.trim();
    const msg = document.getElementById("msg");
    const formationEl = document.getElementById("formation");
    const idsEl = document.getElementById("ids");
    const cmd = document.getElementById("cmd");
    msg.textContent = "";
    formationEl.textContent = "";
    idsEl.style.display = "none";
    idsEl.textContent = "";
    cmd.value = "";

    if (!raw) {
        msg.textContent = "Please enter your team.";
        msg.className = "error";
        return;
    }

    let blocks;
    if (raw.match(/^\s*.+\| ID:/m)) {
        blocks = raw
            .split(/(?=^.+\| ID:)/m)
            .map((b) => b.trim())
            .filter((b) => b.length);
    } else {
        blocks = raw
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length);
    }

    if (blocks.length !== 6) {
        msg.textContent = "You must enter exactly 6 heroes.";
        msg.className = "error";
        return;
    }

    const heroes = blocks.map((block) => {
        if (block.includes("ID:")) {
            const idMatch = block.match(/ID:\s*(s\d+)/i);
            const powerMatch = block.match(/PWR:\s*(\d+)(?:\s*\(\+(\d+)\))?/i);
            const typeMatch = block.match(/Type:\s*(Offense|Defense|Support)/i);
            const nameMatch = block.match(/^([^|\n]+)/);
            const name = nameMatch ? nameMatch[1].trim() : "Unknown";
            const id = idMatch ? idMatch[1] : "";
            const basePwr = powerMatch ? parseInt(powerMatch[1]) : 0;
            const bonusPwr = powerMatch && powerMatch[2] ? parseInt(powerMatch[2]) : 0;
            const totalPwr = basePwr + bonusPwr;
            const roleRaw = typeMatch ? typeMatch[1] : "";
            return { name, id, role: normalizeRole(roleRaw), power: totalPwr };
        } else {
            const parts = block
                .split(/\t|,|\|/)
                .map((p) => p.trim())
                .filter((p) => p.length);
            if (parts.length < 3) return null;
            const name = parts[0];
            const id = parts.find((p) => /^s\d+$/i.test(p)) || parts[parts.length - 1];
            const role = parts.find((p) => /off|def|sup/i.test(p)) || parts[2] || "";
            const pwrStr = parts[1] && /^\d+$/.test(parts[1]) ? parts[1] : "0";
            const totalPwr = parseInt(pwrStr) || 0;
            return { name, role: normalizeRole(role), id, power: totalPwr };
        }
    });

    if (heroes.some((h) => !h.id || !h.role)) {
        msg.textContent = "Parsing error. Ensure each hero has an ID and a role (Off/Def/Sup).";
        msg.className = "error";
        return;
    }

    const counts = { Off: 0, Def: 0, Sup: 0 };
    heroes.forEach((h) => {
        if (h.role) counts[h.role]++;
    });

    const found = findFormation(counts);
    if (!found) {
        msg.textContent = "No matching formation found for this role distribution.";
        msg.className = "error";
        return;
    }

    let totalPower = heroes.reduce((sum, h) => sum + (h.power || 0), 0);
    const bonusSelect = document.getElementById("animeBonus");
    const bonusValue = parseInt(bonusSelect.value) || 0;
    totalPower += bonusValue;

    formationEl.textContent = `Formation: ${found.name} — ${found.pattern.join(", ")} (Team Power: ${totalPower})`;

    const built = buildCommand(heroes, found.pattern);
    if (built.error) {
        msg.textContent = built.error;
        msg.className = "error";
        return;
    }

    const ids = built.ids.join(",");
    idsEl.style.display = "block";
    idsEl.textContent = ids;

    cmd.value = `/multi teamadd preset:PVP query:${ids}`;
    document.getElementById("cmdPVE").value = `/multi teamadd preset:PVE query:${ids}`;
    document.getElementById("cmdFLEX").value = `/multi teamadd preset:FLEX query:${ids}`;

    msg.textContent = "Success!";
    msg.className = "success";
});

document.getElementById("copy").addEventListener("click", () => {
    const cmd = document.getElementById("cmd");
    if (!cmd.value) return;
    navigator.clipboard.writeText(cmd.value).then(() => {
        const m = document.getElementById("msg");
        m.textContent = "Copied PVP!";
        m.className = "success";
    });
});

document.getElementById("copyPVE").addEventListener("click", () => {
    const cmd = document.getElementById("cmdPVE");
    if (!cmd.value) return;
    navigator.clipboard.writeText(cmd.value).then(() => {
        const m = document.getElementById("msg");
        m.textContent = "Copied PVE!";
        m.className = "success";
    });
});

document.getElementById("copyFLEX").addEventListener("click", () => {
    const cmd = document.getElementById("cmdFLEX");
    if (!cmd.value) return;
    navigator.clipboard.writeText(cmd.value).then(() => {
        const m = document.getElementById("msg");
        m.textContent = "Copied FLEX!";
        m.className = "success";
    });
});


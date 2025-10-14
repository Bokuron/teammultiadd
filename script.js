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
    "Defense 4": ["Def", "Def", "Def", "Def", "Sup", "Sup"],
    "Defense 5": ["Off", "Off", "Def", "Def", "Def", "Sup"],
    "Defense 6": ["Off", "Sup", "Def", "Def", "Def", "Def"],
    "Defense 7": ["Off", "Sup", "Sup", "Def", "Def", "Def"],
};

// Key = "O4_D1_S1", Value = { name, pattern }
const formationMap = {};
for (const [name, pattern] of Object.entries(formations)) {
    const counts = { Off: 0, Def: 0, Sup: 0 };
    pattern.forEach(r => counts[r]++);
    const key = `O${counts.Off}_D${counts.Def}_S${counts.Sup}`;
    formationMap[key] = { name, pattern };
}

// === Rollen-Normalisierung ===
function normalizeRole(r = "") {
    const m = r.toLowerCase().match(/off|def|sup/);
    return m ? m[0][0].toUpperCase() + m[0].slice(1) : "";
}

// === Helden-Zeilen parsen ===
function parseHeroLine(line) {
    line = line.trim();
    if (!line) return null;

    // Split auf Tab, Pipe, Komma oder mehrere Leerzeichen
    const parts = line.split(/\t|,|\||\s{2,}/).map(p => p.trim()).filter(p => p);

    const name = parts[0];
    const id = parts.find(p => /^s\d+$/i.test(p)) || parts[parts.length - 1];

    let power = 0;
    const pwrMatch = line.match(/(\d+)\s*(?:\+(\d+))?/); // Zahl irgendwo in der Zeile
    if (pwrMatch) power = parseInt(pwrMatch[1]) + (pwrMatch[2] ? parseInt(pwrMatch[2]) : 0);

    let role = parts.find(p => /off|def|sup/i.test(p)) || "";
    role = normalizeRole(role);

    return { name, id, role, power };
}

// === Formation finden ===
function findFormation(counts) {
    const key = `O${counts.Off}_D${counts.Def}_S${counts.Sup}`;
    return formationMap[key] || null;
}

// === /multi IDs zusammenbauen ===
function buildCommand(heroes, pattern) {
    const ids = [];
    const pools = { Off: [], Def: [], Sup: [] };
    for (const h of heroes) if (h.role && h.id) pools[h.role].push(h);
    for (const role of pattern) {
        if (!pools[role] || pools[role].length === 0) return { error: `No heroes left for role ${role}` };
        ids.push(pools[role].shift().id);
    }
    return { ids };
}

// === Event-Handler ===
document.getElementById("run").addEventListener("click", () => {
    const raw = document.getElementById("input").value.trim();
    const msg = document.getElementById("msg");
    const formationEl = document.getElementById("formation");
    const idsEl = document.getElementById("ids");
    const cmdEls = ["cmd", "cmdPVE", "cmdFLEX"].map(id => document.getElementById(id));

    msg.textContent = "";
    formationEl.textContent = "";
    idsEl.style.display = "none";
    idsEl.textContent = "";
    cmdEls.forEach(el => el.value = "");

    if (!raw) return msgError("Please enter your team.");

    const blocks = raw.match(/^\s*.+\| ID:/m)
        ? raw.split(/(?=^.+\| ID:)/m).map(b => b.trim()).filter(Boolean)
        : raw.split("\n").map(l => l.trim()).filter(Boolean);

    if (blocks.length !== 6) return msgError("You must enter exactly 6 heroes.");

    const heroes = blocks.map(parseHeroLine);
    if (heroes.some(h => !h || !h.id || !h.role)) return msgError("Parsing error. Ensure each hero has an ID and a role (Off/Def/Sup).");

    const counts = { Off: 0, Def: 0, Sup: 0 };
    heroes.forEach(h => counts[h.role]++);

    const formation = findFormation(counts);
    if (!formation) return msgError("No matching formation found for this role distribution.");

    const totalPower = heroes.reduce((sum, h) => sum + (h.power || 0), 0) + parseInt(document.getElementById("animeBonus").value || 0);

    formationEl.textContent = `Formation: ${formation.name} — ${formation.pattern.join(", ")} (Team Power: ${totalPower})`;

    const built = buildCommand(heroes, formation.pattern);
    if (built.error) return msgError(built.error);

    const idsStr = built.ids.join(",");
    idsEl.style.display = "block";
    idsEl.textContent = idsStr;

    cmdEls[0].value = `/multi teamadd preset:PVP query:${idsStr}`;
    cmdEls[1].value = `/multi teamadd preset:PVE query:${idsStr}`;
    cmdEls[2].value = `/multi teamadd preset:FLEX query:${idsStr}`;

    msgSuccess("Success!");
});

// === Copy-Buttons (effizient) ===
["cmd", "cmdPVE", "cmdFLEX"].forEach(id => {
    const btn = document.getElementById("copy" + id.replace("cmd", ""));
    btn.addEventListener("click", () => {
        const el = document.getElementById(id);
        if (!el.value) return;
        navigator.clipboard.writeText(el.value).then(() => msgSuccess(`Copied ${id.replace("cmd", "")}!`));
    });
});

// === Hilfsfunktionen ===
function msgError(text) {
    const msg = document.getElementById("msg");
    msg.textContent = text;
    msg.className = "error";
}
function msgSuccess(text) {
    const msg = document.getElementById("msg");
    msg.textContent = text;
    msg.className = "success";
}

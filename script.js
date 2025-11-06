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

function normalizeRole(r) {
    if (!r) return "";
    r = r.toLowerCase();
    if (r.includes("off")) return "Off";
    if (r.includes("def")) return "Def";
    if (r.includes("sup")) return "Sup";
    return "";
}

function parseHero(block) {
    block = block.trim();
    let id = "",
        role = "",
        name = "Unknown",
        power = 0;

    if (block.includes("ID:")) {
        const idMatch = block.match(/ID:\s*(s\d+)/i);
        const powerMatch = block.match(/PWR:\s*(\d+)(?:\s*\(\+(\d+)\))?/i);
        const typeMatch = block.match(/Type:\s*(Offense|Defense|Support)/i);
        const nameMatch = block.match(/^([^|\n]+)/);

        id = idMatch ? idMatch[1] : "";
        role = normalizeRole(typeMatch ? typeMatch[1] : "");
        name = nameMatch ? nameMatch[1].trim() : name;
        power = powerMatch ? parseInt(powerMatch[1] || 0) + parseInt(powerMatch[2] || 0) : 0;
    } else {
        const parts = block.split(/\t|,|\|/).map(p => p.trim()).filter(Boolean);
        if (parts.length < 3) return null;

        name = parts[0];
        id = parts.find(p => /^s\d+$/i.test(p)) || parts[parts.length - 1];
        role = normalizeRole(parts.find(p => /off|def|sup/i.test(p)) || parts[2]);
        power = /^\d+$/.test(parts[1]) ? parseInt(parts[1]) : 0;
    }

    return {
        name,
        id,
        role,
        power
    };
}

function findFormation(counts) {
    return Object.entries(formations).find(([_, pattern]) => {
        const roleCounts = pattern.reduce((acc, r) => {
            acc[r]++;
            return acc;
        }, {
            Off: 0,
            Def: 0,
            Sup: 0
        });
        return roleCounts.Off === counts.Off && roleCounts.Def === counts.Def && roleCounts.Sup === counts.Sup;
    })?.[1] ? {
        name: Object.entries(formations).find(([_, pattern]) => {
            const roleCounts = pattern.reduce((acc, r) => {
                acc[r]++;
                return acc;
            }, {
                Off: 0,
                Def: 0,
                Sup: 0
            });
            return roleCounts.Off === counts.Off && roleCounts.Def === counts.Def && roleCounts.Sup === counts.Sup;
        })[0],
        pattern: Object.entries(formations).find(([_, pattern]) => {
            const roleCounts = pattern.reduce((acc, r) => {
                acc[r]++;
                return acc;
            }, {
                Off: 0,
                Def: 0,
                Sup: 0
            });
            return roleCounts.Off === counts.Off && roleCounts.Def === counts.Def && roleCounts.Sup === counts.Sup;
        })[1]
    } : null;
}

function buildCommand(order, pattern) {
    const pools = {
        Off: [],
        Def: [],
        Sup: []
    };
    order.forEach(h => {
        if (h.role && h.id) pools[h.role].push(h);
    });

    const ids = [];
    for (const role of pattern) {
        if (!pools[role].length) return {
            error: `No heroes left for role ${role}`
        };
        ids.push(pools[role].shift().id);
    }
    return {
        ids
    };
}

function copyCommand(id, message) {
    const cmdEl = document.getElementById(id);
    if (!cmdEl.value) return;
    navigator.clipboard.writeText(cmdEl.value).then(() => {
        const m = document.getElementById("msg");
        m.textContent = message;
        m.className = "success";
    });
}

document.getElementById("run").addEventListener("click", () => {
    const raw = document.getElementById("input").value.trim();
    const msg = document.getElementById("msg");
    const formationEl = document.getElementById("formation");
    const idsEl = document.getElementById("ids");
    const cmdPVP = document.getElementById("cmd");
    const cmdPVE = document.getElementById("cmdPVE");
    const cmdTOURNAMENT = document.getElementById("cmdTOURNAMENT");

    msg.textContent = "";
    formationEl.textContent = "";
    idsEl.style.display = "none";
    idsEl.textContent = "";
    [cmdPVP, cmdPVE, cmdTOURNAMENT].forEach(el => el.value = "");

    if (!raw) return msg.textContent = "Please enter your team.", msg.className = "error";

    const blocks = raw.includes("ID:") ? raw.split(/(?=^.+\| ID:)/m) : raw.split("\n");
    if (blocks.length !== 6) return msg.textContent = "You must enter exactly 6 heroes.", msg.className = "error";

    const heroes = blocks.map(parseHero);
    if (heroes.some(h => !h || !h.id || !h.role)) return msg.textContent = "Parsing error. Ensure each hero has an ID and a role (Off/Def/Sup).", msg.className = "error";

    const counts = heroes.reduce((acc, h) => {
        acc[h.role]++;
        return acc;
    }, {
        Off: 0,
        Def: 0,
        Sup: 0
    });
    const found = findFormation(counts);
    if (!found) return msg.textContent = "No matching formation found for this role distribution.", msg.className = "error";

    const bonus = parseInt(document.getElementById("animeBonus").value) || 0;
    const totalPower = heroes.reduce((sum, h) => sum + h.power, 0) + bonus;

    formationEl.textContent = `Formation: ${found.name} — ${found.pattern.join(", ")} (Team Power: ${totalPower})`;

    const built = buildCommand(heroes, found.pattern);
    if (built.error) return msg.textContent = built.error, msg.className = "error";

    const ids = built.ids.join(",");
    idsEl.style.display = "block";
    idsEl.textContent = ids;

    cmdPVP.value = `/multi teamadd preset:PVP query:${ids}`;
    cmdPVE.value = `/multi teamadd preset:PVE query:${ids}`;
    cmdTOURNAMENT.value = `/multi teamadd preset:TOURNAMENT query:${ids}`;

    msg.textContent = "Success!";
    msg.className = "success";
});

["copy", "copyPVE", "copyTOURNAMENT"].forEach(id => {
    document.getElementById(id).addEventListener("click", () => {
        const map = {
            copy: "Copied PVP!",
            copyPVE: "Copied PVE!",
            copyTOURNAMENT: "Copied TOURNAMENT!"
        };
        copyCommand(id === "copy" ? "cmd" : id === "copyPVE" ? "cmdPVE" : "cmdTOURNAMENT", map[id]);
    });
});




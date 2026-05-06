// Minimal but realistic JSON:API fixtures used when PUBG_USE_MOCKS=1
// or when the API key is empty. They mirror the shape of api.pubg.com responses.

export const seasonsFixture = {
  data: [
    {
      type: "season",
      id: "division.bro.official.pc-2018-32",
      attributes: { isCurrentSeason: false, isOffseason: false },
    },
    {
      type: "season",
      id: "division.bro.official.pc-2018-33",
      attributes: { isCurrentSeason: false, isOffseason: false },
    },
    {
      type: "season",
      id: "division.bro.official.pc-2018-34",
      attributes: { isCurrentSeason: true, isOffseason: false },
    },
  ],
};

const matchIds = [
  "match-mock-aaaa-1111-1111-111111111111",
  "match-mock-bbbb-2222-2222-222222222222",
  "match-mock-cccc-3333-3333-333333333333",
  "match-mock-dddd-4444-4444-444444444444",
  "match-mock-eeee-5555-5555-555555555555",
];

export const playerFixture = {
  data: {
    type: "player",
    id: "account.mock-player-id-shroud-12345",
    attributes: {
      name: "shroud",
      shardId: "steam",
      patchVersion: "",
      titleId: "bluehole-pubg",
      stats: null,
    },
    relationships: {
      matches: {
        data: matchIds.map((id) => ({ type: "match", id })),
      },
    },
  },
};

export const playersSearchFixture = (name: string) => ({
  data: [
    {
      type: "player",
      id: "account.mock-player-id-" + name + "-12345",
      attributes: {
        name: name,
        shardId: "steam",
        patchVersion: "",
        titleId: "bluehole-pubg",
        stats: null,
      },
      relationships: {
        matches: {
          data: matchIds.map((id) => ({ type: "match", id })),
        },
      },
    },
  ],
});

const buildModeStats = (mult = 1) => ({
  assists: 12 * mult,
  bestRankPoint: 4521.3,
  boosts: 145 * mult,
  dBNOs: 38 * mult,
  dailyKills: 2,
  dailyWins: 0,
  damageDealt: 18234.5 * mult,
  days: 24,
  headshotKills: 47 * mult,
  heals: 312 * mult,
  killPoints: 0,
  kills: 184 * mult,
  longestKill: 412.7,
  longestTimeSurvived: 1850.2,
  losses: 78 * mult,
  maxKillStreaks: 4,
  mostSurvivalTime: 1850.2,
  rankPoints: 3241.8,
  rankPointsTitle: "Diamond-3",
  revives: 22 * mult,
  rideDistance: 38234.5 * mult,
  roadKills: 1,
  roundMostKills: 8,
  roundsPlayed: 84 * mult,
  suicides: 1,
  swimDistance: 1245.3 * mult,
  teamKills: 0,
  timeSurvived: 38420.5 * mult,
  top10s: 36 * mult,
  vehicleDestroys: 4,
  walkDistance: 121345.7 * mult,
  weaponsAcquired: 478 * mult,
  weeklyKills: 9,
  weeklyWins: 1,
  wins: 11 * mult,
});

export const playerSeasonStatsFixture = {
  data: {
    type: "playerSeason",
    attributes: {
      gameModeStats: {
        solo: buildModeStats(0.6),
        duo: buildModeStats(0.8),
        squad: buildModeStats(1.2),
        "solo-fpp": buildModeStats(0.7),
        "duo-fpp": buildModeStats(0.9),
        "squad-fpp": buildModeStats(1.4),
      },
    },
    relationships: {
      player: {
        data: { type: "player", id: "account.mock-player-id-shroud-12345" },
      },
      season: {
        data: { type: "season", id: "division.bro.official.pc-2018-34" },
      },
      matchesSolo: { data: [] },
      matchesSoloFPP: { data: [] },
      matchesDuo: { data: [] },
      matchesDuoFPP: { data: [] },
      matchesSquad: { data: [] },
      matchesSquadFPP: { data: [] },
    },
  },
};

export const playerLifetimeStatsFixture = {
  data: {
    type: "playerSeason",
    attributes: {
      gameModeStats: {
        solo: buildModeStats(3.5),
        duo: buildModeStats(4.0),
        squad: buildModeStats(8.0),
        "solo-fpp": buildModeStats(3.8),
        "duo-fpp": buildModeStats(4.5),
        "squad-fpp": buildModeStats(9.5),
      },
    },
    relationships: {
      player: {
        data: { type: "player", id: "account.mock-player-id-shroud-12345" },
      },
      season: { data: { type: "season", id: "lifetime" } },
    },
  },
};

const weapons = [
  ["Item_Weapon_AKM_C", 87, 1240, 412],
  ["Item_Weapon_M416_C", 92, 1530, 534],
  ["Item_Weapon_SCAR-L_C", 64, 720, 218],
  ["Item_Weapon_Kar98k_C", 71, 540, 148],
  ["Item_Weapon_AWM_C", 32, 78, 24],
  ["Item_Weapon_M24_C", 45, 312, 87],
  ["Item_Weapon_Mini14_C", 38, 245, 68],
  ["Item_Weapon_SKS_C", 51, 421, 132],
  ["Item_Weapon_UMP_C", 28, 198, 64],
  ["Item_Weapon_Vector_C", 22, 124, 48],
  ["Item_Weapon_Groza_C", 41, 312, 94],
  ["Item_Weapon_Beryl_C", 56, 487, 142],
] as const;

export const weaponMasteryFixture = {
  data: {
    type: "weaponMasterySummary",
    attributes: {
      weaponSummaries: weapons.reduce(
        (acc, [id, level, kills, headshots]) => {
          acc[id as string] = {
            LevelCurrent: level,
            XPTotal: (level as number) * 1500,
            TierCurrent: Math.floor((level as number) / 10),
            StatsTotal: {
              Kills: kills,
              DamagePlayer: (kills as number) * 110,
              HeadShots: headshots,
              LongestDefeat: 124.5 + (level as number) * 2,
              MostDamagePlayerInAGame: 854.2,
              Groggies: (kills as number) * 0.4,
            },
          };
          return acc;
        },
        {} as Record<string, unknown>,
      ),
    },
    relationships: {
      player: {
        data: { type: "player", id: "account.mock-player-id-shroud-12345" },
      },
    },
  },
};

export const survivalMasteryFixture = {
  data: {
    type: "survivalMastery",
    attributes: {
      level: 38,
      xp: 12450,
      totalXp: 145320,
      tier: 4,
      tierSubLevel: 2,
      stats: {
        airDropsCalled: { total: 124 },
        damageDealt: { total: 152340 },
        damageTaken: { total: 121450 },
        distanceBySwimming: { total: 12340.5 },
        distanceByVehicle: { total: 384230.7 },
        distanceOnFoot: { total: 1213450.2 },
        distanceTotal: { total: 1610021.4 },
        enemyCratesLooted: { total: 14 },
        healed: { total: 41230 },
        hotDropLandings: { total: { tag: "Pochinki", total: 32 } },
        huntersTakenDown: { total: 412 },
        positionRank: { best: 1 },
        revived: { total: 21 },
        teammatesRevived: { total: 84 },
        throwablesThrown: { total: 1240 },
        timeSurvived: { total: 1248320 },
        topTenCount: { total: 348 },
        wins: { total: 142 },
      },
    },
    relationships: {
      player: {
        data: { type: "player", id: "account.mock-player-id-shroud-12345" },
      },
    },
  },
};

const PARTICIPANTS = [
  ["shroud", "account.mock-player-id-shroud-12345", 1, 12, 1842.5, 312.7, 0.92],
  ["chocoTaco", "account.mock-player-id-chocotaco-22345", 2, 9, 1521.3, 245.2, 0.85],
  ["WackyJacky", "account.mock-player-id-wjacky-32345", 3, 7, 1340.7, 189.5, 0.78],
  ["DrDisrespect", "account.mock-player-id-drdsrspt-42345", 4, 5, 980.1, 142.3, 0.7],
  ["TimTheTatman", "account.mock-player-id-timthetatman-52345", 5, 6, 1080.4, 168.9, 0.74],
  ["Halifax", "account.mock-player-id-halifax-62345", 6, 4, 720.5, 98.2, 0.65],
  ["Lurn", "account.mock-player-id-lurn-72345", 7, 3, 540.8, 78.1, 0.58],
  ["RagingShinobi", "account.mock-player-id-ragsh-82345", 8, 2, 410.2, 54.7, 0.52],
] as const;

function buildMatch(matchId: string, mapName: string, gameMode = "squad-fpp") {
  const participantsRes = PARTICIPANTS.map((p, i) => ({
    type: "participant",
    id: `participant-${matchId}-${i}`,
    attributes: {
      stats: {
        DBNOs: 4 - Math.floor(i / 3),
        assists: 3,
        boosts: 12,
        damageDealt: p[4],
        deathType: i === 0 ? "alive" : "byplayer",
        headshotKills: Math.floor((p[3] as number) * 0.3),
        heals: 8,
        killPlace: i + 1,
        killPoints: 0,
        killStreaks: 2,
        kills: p[3],
        longestKill: p[5],
        mostDamage: 0,
        name: p[0],
        playerId: p[1],
        revives: 1,
        rideDistance: 1245.5,
        roadKills: 0,
        swimDistance: 12.3,
        teamKills: 0,
        timeSurvived: 1842 - i * 60,
        vehicleDestroys: 0,
        walkDistance: 2548.2,
        weaponsAcquired: 14,
        winPlace: i + 1,
      },
      actor: "",
      shardId: "steam",
    },
  }));

  const rosters = Array.from({ length: 4 }).map((_, i) => ({
    type: "roster",
    id: `roster-${matchId}-${i}`,
    attributes: {
      shardId: "steam",
      stats: {
        rank: i + 1,
        teamId: i + 1,
      },
      won: i === 0 ? "true" : "false",
    },
    relationships: {
      participants: {
        data: participantsRes
          .slice(i * 2, i * 2 + 2)
          .map((p) => ({ type: "participant", id: p.id })),
      },
      team: { data: null },
    },
  }));

  return {
    data: {
      type: "match",
      id: matchId,
      attributes: {
        createdAt: "2024-08-12T18:42:13Z",
        duration: 1842,
        gameMode,
        mapName,
        isCustomMatch: false,
        seasonState: "progress",
        shardId: "steam",
        stats: null,
        tags: null,
        titleId: "bluehole-pubg",
      },
      relationships: {
        rosters: { data: rosters.map((r) => ({ type: "roster", id: r.id })) },
        assets: {
          data: [{ type: "asset", id: `asset-${matchId}-telemetry` }],
        },
      },
    },
    included: [
      ...rosters,
      ...participantsRes,
      {
        type: "asset",
        id: `asset-${matchId}-telemetry`,
        attributes: {
          name: "telemetry",
          URL: "MOCK_TELEMETRY",
          createdAt: "2024-08-12T18:42:13Z",
          description: "",
        },
      },
    ],
  };
}

export const matchFixtures: Record<string, ReturnType<typeof buildMatch>> = {
  [matchIds[0]!]: buildMatch(matchIds[0]!, "Baltic_Main"),
  [matchIds[1]!]: buildMatch(matchIds[1]!, "Desert_Main", "squad"),
  [matchIds[2]!]: buildMatch(matchIds[2]!, "Savage_Main", "duo-fpp"),
  [matchIds[3]!]: buildMatch(matchIds[3]!, "DihorOtok_Main", "squad-fpp"),
  [matchIds[4]!]: buildMatch(matchIds[4]!, "Range_Main", "solo"),
};

export const leaderboardFixture = {
  data: {
    type: "leaderboard",
    id: "division.bro.official.pc-2018-34:squad-fpp",
    attributes: {
      shardId: "steam",
      gameMode: "squad-fpp",
      seasonId: "division.bro.official.pc-2018-34",
    },
    relationships: {
      players: {
        data: PARTICIPANTS.slice(0, 8).map((p, i) => ({
          type: "player",
          id: `${p[1]}-rank-${i + 1}`,
        })),
      },
    },
  },
  included: PARTICIPANTS.slice(0, 8).map((p, i) => ({
    type: "player",
    id: `${p[1]}-rank-${i + 1}`,
    attributes: {
      name: p[0],
      rank: i + 1,
      stats: {
        rankPoints: 6500 - i * 230,
        wins: 41 - i * 3,
        games: 82 - i * 4,
        winRatio: (41 - i * 3) / (82 - i * 4),
        averageDamage: 412 - i * 18,
        kills: 312 - i * 22,
        killDeathRatio: 4.8 - i * 0.3,
        kda: 5.2 - i * 0.4,
        averageRank: 2.1 + i * 0.3,
        tier: i < 3 ? "Master" : "Diamond",
        subTier: "1",
      },
    },
  })),
};

export const matchIdsList = matchIds;

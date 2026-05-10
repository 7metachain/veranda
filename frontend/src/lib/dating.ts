// Mock implementation of the "pay to reveal dating address" flow.
//
// The candidates page calls `unlockDatingAddress(...)` after the user
// taps the paywall. This intentionally stays a single function so the
// real flow (using the existing `DisclosurePayment` component or an
// on-chain transfer through anchor-client) can be swapped in here
// without touching any UI.

export type DatingAddressUnlock = {
  displayName: string;
  venue: string;
  address: string;
  suggestedTime: string;
  handle: string;
};

const VENUES = [
  {
    venue: "Café Mille",
    address: "12 Rua das Flores, Lisbon · 2nd floor terrace",
  },
  {
    venue: "Bar Forty",
    address: "40 Latimer Rd, London · backroom booth #3",
  },
  {
    venue: "Tonari Tokyo",
    address: "1-7-12 Shibuya, Tokyo · counter seat 4",
  },
  {
    venue: "The Hideaway",
    address: "88 Rivington St, NYC · downstairs",
  },
  {
    venue: "Chez Margaux",
    address: "5 Rue Saint-Anne, Paris · garden table 2",
  },
  {
    venue: "Loro Café",
    address: "21 Carrer Verdi, Barcelona · sunlit corner",
  },
];

const TIMES = [
  "Sat 19:30",
  "Fri 20:00",
  "Sun 11:30 (brunch)",
  "Wed 18:45",
  "Sat 17:00 (golden hour)",
];

const HANDLES = ["@em.j", "@liam.g", "@sophia.m", "@noah.w", "@olivia.b"];

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

/** Resolves to the unlocked address. In demo / mock mode this is
 *  instantaneous; swap the body for a real on-chain transfer + backend
 *  disclose call when wiring DisclosurePayment in. */
export async function unlockDatingAddress(args: {
  sessionId: string;
  candidateIndex: number;
  candidateName: string;
}): Promise<DatingAddressUnlock> {
  // Tiny artificial delay so the button briefly shows "Unlocking…" —
  // helps the demo feel real.
  await new Promise((r) => setTimeout(r, 350));
  const v = pick(VENUES, args.candidateIndex);
  return {
    displayName: args.candidateName,
    venue: v.venue,
    address: v.address,
    suggestedTime: pick(TIMES, args.candidateIndex + 1),
    handle: pick(HANDLES, args.candidateIndex + 2),
  };
}

use anchor_lang::prelude::*;

use crate::MatchRecorded;

/// One row in the rollup's pairwise score log. Lives at the PDA
/// `[b"match", agent_a, agent_b, &[round]]`. We allocate it ad-hoc per pair;
/// at end-of-round the backend reads them back en masse and aggregates.
#[account]
#[derive(InitSpace)]
pub struct MatchScoreLog {
    pub agent_a: Pubkey,
    pub agent_b: Pubkey,
    pub score: u16,
    pub round: u8,
    pub recorded_at: i64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(agent_a: Pubkey, agent_b: Pubkey, score: u16, round: u8)]
pub struct RecordMatch<'info> {
    #[account(mut)]
    pub recorder: Signer<'info>,

    #[account(
        init_if_needed,
        payer = recorder,
        space = 8 + MatchScoreLog::INIT_SPACE,
        seeds = [
            b"match",
            agent_a.as_ref(),
            agent_b.as_ref(),
            &[round],
        ],
        bump,
    )]
    pub log: Account<'info, MatchScoreLog>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RecordMatch>,
    agent_a: Pubkey,
    agent_b: Pubkey,
    score: u16,
    round: u8,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let log = &mut ctx.accounts.log;
    log.agent_a = agent_a;
    log.agent_b = agent_b;
    log.score = score;
    log.round = round;
    log.recorded_at = now;
    log.bump = ctx.bumps.log;

    emit!(MatchRecorded {
        agent_a,
        agent_b,
        score,
        round,
        recorded_at: now,
    });

    Ok(())
}

use anyhow::Result;
use sqlx::postgres::PgPoolOptions;

pub type PgPool = sqlx::PgPool;

pub async fn connect(url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(url)
        .await?;
    Ok(pool)
}

pub async fn run_migrations(pool: &PgPool) -> Result<()> {
    // Apply each .sql migration in order. We embed them at compile time via
    // `include_str!` so the binary is self-contained.
    let scripts: [(&str, &str); 4] = [
        (
            "001_users",
            include_str!("./migrations/001_users.sql"),
        ),
        (
            "002_agents",
            include_str!("./migrations/002_agents.sql"),
        ),
        (
            "003_matches",
            include_str!("./migrations/003_matches.sql"),
        ),
        (
            "004_disclosures",
            include_str!("./migrations/004_disclosures.sql"),
        ),
    ];

    for (name, sql) in scripts {
        tracing::info!("running migration {name}");
        sqlx::raw_sql(sql).execute(pool).await?;
    }
    Ok(())
}

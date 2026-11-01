import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

it('upgrades an existing account without losing study history, streaks, or pet care', async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const schema = `retirement_${Date.now()}`;
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    const journal = JSON.parse(
      readFileSync('drizzle/meta/_journal.json', 'utf8'),
    );
    for (const entry of journal.entries.filter(
      (e: { idx: number }) => e.idx < 12,
    )) {
      const sql = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8').replaceAll(
        '"public".',
        `"${schema}".`,
      );
      await client.query(sql);
    }
    await client.query(`
      INSERT INTO users (id,email) VALUES ('existing','existing@test.local');
      INSERT INTO user_stats (user_id,focus_balance,insight_balance,xp,level,streak_days,streak_freezes,last_session_date)
        VALUES ('existing',1000,30,200,2,7,1,'2026-11-01');
      INSERT INTO focus_sessions (id,user_id,started_at,ended_at,status,focused_ms,credited_ms,loot_seed,quiz_multiplier,quiz_correct,quiz_total)
        VALUES ('00000000-0000-4000-8000-000000000001','existing',now()-interval '25 minutes',now(),'completed',1500000,1500000,'old-seed',2,8,8);
      INSERT INTO islands (id,user_id) VALUES ('00000000-0000-4000-8000-000000000002','existing');
      INSERT INTO placements (island_id,asset_id,x,z) VALUES ('00000000-0000-4000-8000-000000000002','tree_round',0,0);
      INSERT INTO caches (user_id,session_id,rarity,contents) VALUES ('existing','00000000-0000-4000-8000-000000000001','rare','{}');
      INSERT INTO pets (user_id,name,bowls_fed) VALUES ('existing','Toast',2);
      INSERT INTO note_sources (id,user_id,kind,title,content_hash) VALUES ('00000000-0000-4000-8000-000000000003','existing','paste','Notes','hash');
      INSERT INTO note_chunks (id,source_id,ordinal,text,token_count) VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003',0,'Study notes',2);
      INSERT INTO cards (id,user_id,chunk_id,question,answer,source_quote,next_due_at,fsrs_state) VALUES ('00000000-0000-4000-8000-000000000005','existing','00000000-0000-4000-8000-000000000004','Q','A','Quote',now(),'{}');
      INSERT INTO card_reviews (card_id,rating,elapsed_ms) VALUES ('00000000-0000-4000-8000-000000000005',3,2000);
      INSERT INTO session_quiz_questions (session_id,card_id,ordinal,snapshot,option_index,correct) VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005',0,'{}',0,true);
    `);
    const retained = [
      'users',
      'pets',
      'note_sources',
      'note_chunks',
      'cards',
      'card_reviews',
      'session_quiz_questions',
    ];
    const before = await Promise.all(
      retained.map(
        async (table) => (await client.query(`SELECT * FROM ${table}`)).rows,
      ),
    );
    await client.query(readFileSync('drizzle/0012_retire_island.sql', 'utf8'));
    for (const [i, table] of retained.entries()) {
      expect((await client.query(`SELECT * FROM ${table}`)).rows).toEqual(
        before[i],
      );
    }
    expect(
      (await client.query('SELECT * FROM user_stats')).rows[0],
    ).toMatchObject({ streak_days: 7, streak_freezes: 1 });
    expect(
      (await client.query('SELECT * FROM focus_sessions')).rows[0],
    ).toMatchObject({ credited_ms: 1500000, quiz_correct: 8, quiz_total: 8 });
    for (const table of ['islands', 'placements', 'caches']) {
      expect(
        (
          await client.query('SELECT to_regclass($1) AS name', [
            `${schema}.${table}`,
          ])
        ).rows[0].name,
      ).toBeNull();
    }
    const columns = (
      await client.query(
        'SELECT column_name FROM information_schema.columns WHERE table_schema=$1',
        [schema],
      )
    ).rows.map((r) => r.column_name);
    for (const field of [
      'focus_balance',
      'insight_balance',
      'xp',
      'level',
      'pity_counter',
      'loot_seed',
      'quiz_multiplier',
    ])
      expect(columns).not.toContain(field);
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});

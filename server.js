import express from "express";
import bodyParser from "body-parser";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(bodyParser.json());

// Conexão PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ⚡ use variável de ambiente
  ssl: { rejectUnauthorized: false } // necessário em alguns hosts
});

// Criar tabelas
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS programas (
      codigo TEXT PRIMARY KEY,
      padrao1 REAL,
      qtd_matrizes INTEGER
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matrizaria (
      id SERIAL PRIMARY KEY,
      programa_codigo TEXT REFERENCES programas(codigo) ON DELETE CASCADE,
      numeracao REAL,
      matrizes REAL,
      girosInicial REAL
    );
  `);
}
initDB();

// Salvar programa (upsert)
app.post("/programa", async (req, res) => {
  try {
    const { codigo, padrao1, qtd_matrizes, dados_matrizaria } = req.body;

    await pool.query(
      `INSERT INTO programas (codigo, padrao1, qtd_matrizes)
       VALUES ($1, $2, $3)
       ON CONFLICT (codigo) DO UPDATE SET padrao1 = EXCLUDED.padrao1, qtd_matrizes = EXCLUDED.qtd_matrizes`,
      [codigo, padrao1, qtd_matrizes]
    );

    await pool.query(`DELETE FROM matrizaria WHERE programa_codigo = $1`, [codigo]);

    for (const item of dados_matrizaria) {
      await pool.query(
        `INSERT INTO matrizaria (programa_codigo, numeracao, matrizes, girosInicial)
         VALUES ($1, $2, $3, $4)`,
        [codigo, item.numeracao, item.matrizes, item.girosInicial]
      );
    }

    res.json({ message: "Programa salvo com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar programa" });
  }
});

// Buscar programa
app.get("/programa/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const programaRes = await pool.query(`SELECT * FROM programas WHERE codigo = $1`, [codigo]);

    if (programaRes.rowCount === 0) return res.status(404).json({ error: "Programa não encontrado" });

    const programa = programaRes.rows[0];
    const matrizariaRes = await pool.query(`SELECT * FROM matrizaria WHERE programa_codigo = $1`, [codigo]);

    res.json({
      ...programa,
      dados_matrizaria: matrizariaRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar programa" });
  }
});

// Limpar banco (com senha)
app.delete("/programa", async (req, res) => {
  try {
    await pool.query(`DELETE FROM matrizaria`);
    await pool.query(`DELETE FROM programas`);
    res.json({ message: "Banco limpo com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao limpar banco" });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

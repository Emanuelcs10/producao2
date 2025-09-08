// server.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// arquivo do DB (mesma pasta)
const DB_FILE = path.join(__dirname, "producao.db");
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error("Erro ao abrir DB:", err.message);
    process.exit(1);
  }
  console.log("SQLite aberto em", DB_FILE);
});

// cria tabela se precisar
db.run(`
  CREATE TABLE IF NOT EXISTS programas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE,
    padrao1 REAL,
    qtd_matrizes INTEGER,
    dados_matrizaria TEXT
  )
`, (err) => {
  if (err) console.error("Erro criando tabela:", err.message);
});

// rota de saúde
app.get("/health", (req, res) => res.json({ ok: true }));

// criar/atualizar (upsert)
app.post("/programa", (req, res) => {
  const { codigo, padrao1, qtd_matrizes, dados_matrizaria } = req.body;
  if (!codigo) return res.status(400).json({ error: "codigo requerido" });

  const sql = `INSERT INTO programas (codigo, padrao1, qtd_matrizes, dados_matrizaria)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(codigo) DO UPDATE SET
                 padrao1=excluded.padrao1,
                 qtd_matrizes=excluded.qtd_matrizes,
                 dados_matrizaria=excluded.dados_matrizaria`;
  db.run(sql, [codigo, padrao1, qtd_matrizes, JSON.stringify(dados_matrizaria)], function(err) {
    if (err) {
      console.error("POST /programa erro:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Programa salvo/atualizado com sucesso", codigo });
  });
});

// buscar por código
app.get("/programa/:codigo", (req, res) => {
  db.get("SELECT * FROM programas WHERE codigo = ?", [req.params.codigo], (err, row) => {
    if (err) {
      console.error("GET /programa/:codigo erro:", err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!row) return res.status(404).json({ error: "Programa não encontrado" });

    res.json({
      codigo: row.codigo,
      padrao1: row.padrao1,
      qtd_matrizes: row.qtd_matrizes,
      dados_matrizaria: JSON.parse(row.dados_matrizaria || "[]")
    });
  });
});

// editar explicitamente
app.put("/programa/:codigo", (req, res) => {
  const codigo = req.params.codigo;
  const { padrao1, qtd_matrizes, dados_matrizaria } = req.body;
  db.run(
    "UPDATE programas SET padrao1 = ?, qtd_matrizes = ?, dados_matrizaria = ? WHERE codigo = ?",
    [padrao1, qtd_matrizes, JSON.stringify(dados_matrizaria), codigo],
    function(err) {
      if (err) {
        console.error("PUT /programa/:codigo erro:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) return res.status(404).json({ error: "Programa não encontrado" });
      res.json({ message: "Programa atualizado", codigo });
    }
  );
});

// apagar um programa específico (opcional)
app.delete("/programa/:codigo", (req, res) => {
  db.run("DELETE FROM programas WHERE codigo = ?", [req.params.codigo], function(err) {
    if (err) {
      console.error("DELETE /programa/:codigo erro:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Programa removido", removed: this.changes });
  });
});

// *** ROTA: apagar TODO o banco (limpar tabela) ***
app.delete("/programa", (req, res) => {
  db.run("DELETE FROM programas", function(err) {
    if (err) {
      console.error("DELETE /programa erro:", err.message);
      return res.status(500).json({ error: err.message });
    }
    // opcional: compactar arquivo sqlite
    db.run("VACUUM", (vErr) => {
      if (vErr) console.warn("VACUUM erro:", vErr.message);
      return res.json({ message: "Banco limpo", removed: this.changes });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

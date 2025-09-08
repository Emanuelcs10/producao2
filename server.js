const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Rota para salvar programa
app.post("/programa", async (req, res) => {
  try {
    const { codigo, padrao1, qtd_matrizes, dados_matrizaria } = req.body;

    // Salvar programa principal
    const { error: erroPrograma } = await supabase
      .from("programas")
      .upsert({ codigo, padrao1, qtd_matrizes });

    if (erroPrograma) throw erroPrograma;

    // Salvar matrizaria
    for (const item of dados_matrizaria) {
      const { error: erroMatriz } = await supabase
        .from("matrizaria")
        .upsert({ programa_codigo: codigo, numeracao: item.numeracao, matrizes: item.matrizes, giros_inicial: item.girosInicial });

      if (erroMatriz) throw erroMatriz;
    }

    res.status(200).json({ message: "Programa salvo com sucesso!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar programa: " + err.message });
  }
});

// Rota para buscar programa pelo código
app.get("/programa/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;

    const { data: programa, error: erroPrograma } = await supabase
      .from("programas")
      .select("*")
      .eq("codigo", codigo)
      .single();

    if (erroPrograma || !programa) {
      return res.status(404).json({ error: "Programa não encontrado" });
    }

    const { data: matrizaria, error: erroMatriz } = await supabase
      .from("matrizaria")
      .select("*")
      .eq("programa_codigo", codigo);

    if (erroMatriz) throw erroMatriz;

    res.status(200).json({ ...programa, dados_matrizaria: matrizaria });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar programa: " + err.message });
  }
});

// Start do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

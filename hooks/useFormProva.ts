import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore'; // <-- AQUI

export function useFormProva(idProvaEditando?: string | string[]) {
  const { user, escolaId } = useAuthStore(); // Memória rápida

  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<any[]>([]);

  const [nomeProva, setNomeProva] = useState('');
  const [materia, setMateria] = useState<'MAT' | 'PORT'>('MAT');
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<number[]>([]);
  const [qtdQuestoes, setQtdQuestoes] = useState('10');
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [descritores, setDescritores] = useState<Record<number, string>>({});

  useEffect(() => { 
    if (escolaId) carregarDadosIniciais(); 
  }, [idProvaEditando, escolaId]);

  async function carregarDadosIniciais() {
    try {
      // Pega as turmas usando o escolaId da memória
      const { data: turmas } = await supabase.from('tb_turma').select('*').eq('id_escola', escolaId);
      setTurmasDisponiveis(turmas || []);

      if (idProvaEditando) {
        const { data: prova } = await supabase.from('tb_prova').select(`*, tb_aplicacao_prova(id_turma)`).eq('id_prova', idProvaEditando).single();
        if (prova) {
          setNomeProva(prova.titulo);
          setMateria(prova.materia || 'MAT');
          setQtdQuestoes(prova.qtd_questoes.toString());
          setTurmasSelecionadas(prova.tb_aplicacao_prova.map((v: any) => v.id_turma));

          const { data: questoes } = await supabase.from('tb_questao').select('*').eq('id_prova', idProvaEditando);
          if (questoes) {
            const respMap: Record<number, string> = {};
            const descMap: Record<number, string> = {};
            questoes.forEach(q => {
              respMap[q.numero_questao] = q.alternativa_correta;
              descMap[q.numero_questao] = q.descritor || "";
            });
            setRespostas(respMap);
            setDescritores(descMap);
          }
        }
      }
    } catch (e) { console.error(e); }
  }

  async function handleSalvar() {
    if (!nomeProva || turmasSelecionadas.length === 0 || !user || !escolaId) return Alert.alert("Atenção", "Preencha título e turmas.");
    const total = parseInt(qtdQuestoes);

    setLoadingSalvar(true);
    try {
      let id_prova_final = idProvaEditando;

      // Usando os dados do Zustand diretamente
      const payloadProva = { titulo: nomeProva, materia: materia, id_professor: user.id, id_escola: escolaId, qtd_questoes: total };

      if (idProvaEditando) {
        await supabase.from('tb_prova').update(payloadProva).eq('id_prova', idProvaEditando);
        await supabase.from('tb_aplicacao_prova').delete().eq('id_prova', idProvaEditando);
        await supabase.from('tb_questao').delete().eq('id_prova', idProvaEditando);
      } else {
        const { data: prova, error: errP } = await supabase.from('tb_prova').insert([payloadProva]).select().single();
        if (errP) throw errP;
        id_prova_final = prova.id_prova;
      }

      const vinculos = turmasSelecionadas.map(idT => ({ id_prova: id_prova_final, id_turma: idT }));
      await supabase.from('tb_aplicacao_prova').insert(vinculos);

      const questoesParaSalvar = Object.keys(respostas).map(num => ({
        id_prova: id_prova_final, numero_questao: parseInt(num),
        alternativa_correta: respostas[parseInt(num)], descritor: descritores[parseInt(num)] || ""
      }));
      await supabase.from('tb_questao').insert(questoesParaSalvar);

      if (!idProvaEditando) {
        const { data: alunos } = await supabase.from('tb_aluno').select('id_aluno').in('id_turma', turmasSelecionadas);
        if (alunos) {
          const folhas = alunos.map(aluno => ({
            id_prova: id_prova_final, id_aluno: aluno.id_aluno, status: 'PENDENTE',
            codigo_qrcode: `P${id_prova_final}A${aluno.id_aluno}`
          }));
          await supabase.from('tb_folha_resposta').insert(folhas);
        }
      }

      Alert.alert("Sucesso!", "Dados salvos com sucesso.");
      router.back(); 
      
    } catch (e: any) { Alert.alert("Erro", e.message); } finally { setLoadingSalvar(false); }
  }

  return { loadingSalvar, turmasDisponiveis, nomeProva, setNomeProva, materia, setMateria, turmasSelecionadas, setTurmasSelecionadas, qtdQuestoes, setQtdQuestoes, respostas, setRespostas, descritores, setDescritores, handleSalvar };
}
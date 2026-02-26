import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore'; // <-- O CÉREBRO AQUI

export function useConfiguracao() {
  const { escolaId } = useAuthStore(); // PEGA INSTANTÂNEO DA MEMÓRIA

  const [tab, setTab] = useState<'turmas' | 'alunos'>('turmas');
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [serieExpandida, setSerieExpandida] = useState<number | null>(null);
  const [filtroNome, setFiltroNome] = useState('');

  const [modalTurmaVisible, setModalTurmaVisible] = useState(false);
  const [novaSerie, setNovaSerie] = useState('');
  const [novaTurmaLetra, setNovaTurmaLetra] = useState('');
  const [novoTurno, setNovoTurno] = useState('Manhã');

  const [modalAlunoVisible, setModalAlunoVisible] = useState(false);
  const [modoAluno, setModoAluno] = useState<'manual' | 'excel'>('manual');
  const [alunoEditando, setAlunoEditando] = useState<any>(null); 
  const [nomeAluno, setNomeAluno] = useState('');
  const [idTurmaSelecionada, setIdTurmaSelecionada] = useState<number | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [importando, setImportando] = useState(false);

  // OLHA COMO FICOU SIMPLES:
  useEffect(() => { 
    if (escolaId) {
      setLoading(true);
      Promise.all([fetchTurmas(escolaId), fetchAlunos(escolaId)])
        .finally(() => setLoading(false));
    }
  }, [escolaId]);

  async function fetchTurmas(idEscola: number) {
    const { data } = await supabase.from('tb_turma').select('*, tb_aluno(count)').eq('id_escola', idEscola);
    setTurmas(data || []);
  }

  async function fetchAlunos(idEscola: number) {
    const { data } = await supabase.from('tb_aluno').select('*, tb_turma!inner(id_escola, serie, turma, turno)').eq('tb_turma.id_escola', idEscola);
    setAlunos(data || []);
  }

  const abrirModalNovoAluno = () => {
    setAlunoEditando(null); setNomeAluno(''); setIdTurmaSelecionada(null); setModoAluno('manual');
    setModalAlunoVisible(true);
  };

  const abrirModalEditarAluno = (aluno: any) => {
    setAlunoEditando(aluno); setNomeAluno(aluno.nome_completo);
    setIdTurmaSelecionada(aluno.id_turma); setModoAluno('manual'); setModalAlunoVisible(true);
  };

  async function handleSalvarTurma() {
    if (!novaSerie || !novaTurmaLetra || !escolaId) return Alert.alert("Erro", "Preencha tudo!");
    try {
      const { error } = await supabase.from('tb_turma').insert([{
        serie: parseInt(novaSerie), turma: novaTurmaLetra.toUpperCase().charAt(0),
        turno: novoTurno, id_escola: escolaId
      }]);
      if (error) throw error;
      setModalTurmaVisible(false); fetchTurmas(escolaId);
      setNovaSerie(''); setNovaTurmaLetra('');
    } catch (e: any) { Alert.alert("Erro", e.message); }
  }

  async function handleSalvarAluno() {
    if (!nomeAluno || !idTurmaSelecionada || !escolaId) return Alert.alert("Erro", "Selecione a turma e digite o nome.");
    try {
      if (alunoEditando) {
        await supabase.from('tb_aluno').update({ nome_completo: nomeAluno, id_turma: idTurmaSelecionada }).eq('id_aluno', alunoEditando.id_aluno);
      } else {
        await supabase.from('tb_aluno').insert([{ nome_completo: nomeAluno, id_turma: idTurmaSelecionada }]);
      }
      setModalAlunoVisible(false); fetchAlunos(escolaId); fetchTurmas(escolaId);
    } catch (e: any) { Alert.alert("Erro", e.message); }
  }

  async function handleImportarXLSX() {
    if (!idTurmaSelecionada || !escolaId) return Alert.alert("Atenção", "Selecione a turma antes de escolher o arquivo.");
    
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (result.canceled || !result.assets) return;

      setImportando(true);
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' });
      const workbook = XLSX.read(base64, { type: 'base64' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const alunosParaInserir = rows
        .map(row => {
          const nome = row[0]?.toString().trim();
          if (!nome || nome.toLowerCase() === 'nome' || nome.length < 3) return null;
          return { nome_completo: nome, id_turma: idTurmaSelecionada };
        }).filter(a => a !== null);

      if (alunosParaInserir.length === 0) throw new Error("Nenhum nome válido encontrado na primeira coluna.");

      const { error } = await supabase.from('tb_aluno').insert(alunosParaInserir);
      if (error) throw error;

      Alert.alert("Sucesso", `${alunosParaInserir.length} alunos importados!`);
      setModalAlunoVisible(false); fetchAlunos(escolaId); fetchTurmas(escolaId);
    } catch (e: any) { Alert.alert("Erro", e.message); } finally { setImportando(false); }
  }

  const listaAgrupada = Object.values(turmas.reduce((acc: any, item: any) => {
    if (!acc[item.serie]) acc[item.serie] = { serie: item.serie, subTurmas: [], totalAlunos: 0 };
    acc[item.serie].subTurmas.push(item);
    acc[item.serie].totalAlunos += item.tb_aluno[0]?.count || 0;
    return acc;
  }, {})).sort((a: any, b: any) => a.serie - b.serie);

  const turmaSelecionadaObj = turmas.find(t => t.id_turma === idTurmaSelecionada);

  return {
    tab, setTab, loading, turmas, alunos, listaAgrupada, turmaSelecionadaObj,
    serieExpandida, setSerieExpandida, filtroNome, setFiltroNome,
    modalTurmaVisible, setModalTurmaVisible, novaSerie, setNovaSerie, novaTurmaLetra, setNovaTurmaLetra, novoTurno, setNovoTurno,
    modalAlunoVisible, setModalAlunoVisible, modoAluno, setModoAluno, nomeAluno, setNomeAluno, 
    idTurmaSelecionada, setIdTurmaSelecionada, dropdownAberto, setDropdownAberto, importando,
    abrirModalNovoAluno, abrirModalEditarAluno, handleSalvarTurma, handleSalvarAluno, handleImportarXLSX
  };
}
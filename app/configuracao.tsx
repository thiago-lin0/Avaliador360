import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export default function ConfiguracaoScreen() {
  const [tab, setTab] = useState<'turmas' | 'alunos'>('turmas');
  const [modoAluno, setModoAluno] = useState<'manual' | 'excel'>('manual'); // Controla o modo dentro do modal
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [escolaId, setEscolaId] = useState<number | null>(null);
  
  const [serieExpandida, setSerieExpandida] = useState<number | null>(null);
  const [filtroNome, setFiltroNome] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const [modalTurmaVisible, setModalTurmaVisible] = useState(false);
  const [novaSerie, setNovaSerie] = useState('');
  const [novaTurmaLetra, setNovaTurmaLetra] = useState('');
  const [novoTurno, setNovoTurno] = useState('Manhã');

  const [modalAlunoVisible, setModalAlunoVisible] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<any>(null); 
  const [nomeAluno, setNomeAluno] = useState('');
  const [idTurmaSelecionada, setIdTurmaSelecionada] = useState<number | null>(null);

  useEffect(() => { carregarDadosIniciais(); }, []);

  async function carregarDadosIniciais() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from('tb_professor').select('id_escola').eq('auth_id', user.id).single();
      if (prof?.id_escola) {
        setEscolaId(prof.id_escola);
        await Promise.all([fetchTurmas(prof.id_escola), fetchAlunos(prof.id_escola)]);
      }
    } catch (e) { console.log(e); } finally { setLoading(false); }
  }

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
    if (!novaSerie || !novaTurmaLetra) return Alert.alert("Erro", "Preencha tudo!");
    try {
      const { error } = await supabase.from('tb_turma').insert([{
        serie: parseInt(novaSerie), turma: novaTurmaLetra.toUpperCase().charAt(0),
        turno: novoTurno, id_escola: escolaId
      }]);
      if (error) throw error;
      setModalTurmaVisible(false); fetchTurmas(escolaId!);
    } catch (e: any) { Alert.alert("Erro", e.message); }
  }

  async function handleSalvarAluno() {
    if (!nomeAluno || !idTurmaSelecionada) return Alert.alert("Erro", "Selecione a turma e digite o nome.");
    try {
      if (alunoEditando) {
        await supabase.from('tb_aluno').update({ nome_completo: nomeAluno, id_turma: idTurmaSelecionada }).eq('id_aluno', alunoEditando.id_aluno);
      } else {
        await supabase.from('tb_aluno').insert([{ nome_completo: nomeAluno, id_turma: idTurmaSelecionada }]);
      }
      setModalAlunoVisible(false); fetchAlunos(escolaId!); fetchTurmas(escolaId!);
    } catch (e: any) { Alert.alert("Erro", e.message); }
  }

  async function handleImportarXLSX() {
    if (!idTurmaSelecionada) return Alert.alert("Atenção", "Selecione a turma antes de escolher o arquivo.");
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
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
        })
        .filter(a => a !== null);

      if (alunosParaInserir.length === 0) throw new Error("Nenhum nome válido encontrado na primeira coluna.");

      const { error } = await supabase.from('tb_aluno').insert(alunosParaInserir);
      if (error) throw error;

      Alert.alert("Sucesso", `${alunosParaInserir.length} alunos importados!`);
      setModalAlunoVisible(false); fetchAlunos(escolaId!); fetchTurmas(escolaId!);
    } catch (e: any) { Alert.alert("Erro", e.message); } finally { setImportando(false); }
  }

  const listaAgrupada = Object.values(turmas.reduce((acc: any, item: any) => {
    if (!acc[item.serie]) acc[item.serie] = { serie: item.serie, subTurmas: [], totalAlunos: 0 };
    acc[item.serie].subTurmas.push(item);
    acc[item.serie].totalAlunos += item.tb_aluno[0]?.count || 0;
    return acc;
  }, {})).sort((a: any, b: any) => a.serie - b.serie);

  const turmaSelecionadaObj = turmas.find(t => t.id_turma === idTurmaSelecionada);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#003399" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#003399" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Turmas & Alunos</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, tab === 'turmas' && styles.tabActive]} onPress={() => setTab('turmas')}><Text style={[styles.tabText, tab === 'turmas' && styles.tabTextActive]}>Turmas</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'alunos' && styles.tabActive]} onPress={() => setTab('alunos')}><Text style={[styles.tabText, tab === 'alunos' && styles.tabTextActive]}>Alunos</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
        {tab === 'turmas' ? (
          <View>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>SÉRIES CADASTRADAS</Text><TouchableOpacity onPress={() => setModalTurmaVisible(true)}><Text style={styles.addBtnText}>+ NOVA TURMA</Text></TouchableOpacity></View>
            {listaAgrupada.map((item: any) => (
              <View key={item.serie} style={styles.groupWrapper}>
                <TouchableOpacity style={styles.card} onPress={() => setSerieExpandida(serieExpandida === item.serie ? null : item.serie)}>
                  <View><Text style={styles.cardTitle}>{item.serie}º Ano</Text><Text style={styles.cardSub}>{item.subTurmas.length} turmas • {item.totalAlunos} alunos</Text></View>
                  <Ionicons name={serieExpandida === item.serie ? "chevron-up" : "chevron-down"} size={20} color="#CCC" />
                </TouchableOpacity>
                {serieExpandida === item.serie && item.subTurmas.map((st: any) => (
                  <View key={st.id_turma} style={styles.subCard}>
                    <View><Text style={styles.subCardTitle}>Turma {st.turma}</Text><Text style={styles.subCardShift}>{st.turno}</Text></View>
                    <Text style={styles.subCardText}>{st.tb_aluno[0]?.count || 0} alunos</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View>
            <TouchableOpacity style={styles.primaryAddBtn} onPress={abrirModalNovoAluno}><Text style={styles.primaryAddBtnText}>+ Adicionar Alunos</Text></TouchableOpacity>
            <View style={styles.searchContainer}><Ionicons name="search-outline" size={18} color="#AAA" style={{ marginRight: 10 }} /><TextInput style={styles.searchInput} placeholder="Filtrar por nome..." value={filtroNome} onChangeText={setFiltroNome} /></View>
            {alunos.filter(a => a.nome_completo.toLowerCase().includes(filtroNome.toLowerCase())).map((item: any) => (
              <TouchableOpacity key={item.id_aluno} style={styles.alunoItem} onPress={() => abrirModalEditarAluno(item)}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.nome_completo[0]}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.alunoName}>{item.nome_completo}</Text><Text style={styles.alunoClass}>{item.tb_turma?.serie}º {item.tb_turma?.turma} - {item.tb_turma?.turno}</Text></View>
                <Ionicons name="pencil-outline" size={16} color="#DDD" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL ALUNO (INTERFACE REDESENHADA) */}
      <Modal animationType="slide" transparent visible={modalAlunoVisible}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          
          {/* SELETOR DE MODO (Individual vs Excel) */}
          <View style={styles.modeSelector}>
            <TouchableOpacity style={[styles.modeBtn, modoAluno === 'manual' && styles.modeBtnActive]} onPress={() => setModoAluno('manual')}>
              <Text style={[styles.modeBtnText, modoAluno === 'manual' && styles.modeBtnTextActive]}>Individual</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, modoAluno === 'excel' && styles.modeBtnActive]} onPress={() => setModoAluno('excel')}>
              <Text style={[styles.modeBtnText, modoAluno === 'excel' && styles.modeBtnTextActive]}>Em Massa (Excel)</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>1. Turma:</Text>
          <TouchableOpacity style={[styles.dropdownButton, dropdownAberto && styles.dropdownButtonActive]} onPress={() => setDropdownAberto(!dropdownAberto)}>
            <Text style={styles.dropdownButtonText}>{idTurmaSelecionada ? `${turmaSelecionadaObj?.serie}º ${turmaSelecionadaObj?.turma}` : "Selecione a Turma"}</Text>
            <Ionicons name={dropdownAberto ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </TouchableOpacity>

          {dropdownAberto && (
            <View style={styles.dropdownList}><ScrollView style={{ maxHeight: 120 }}>{turmas.map((t: any) => (
              <TouchableOpacity key={t.id_turma} style={styles.dropdownItem} onPress={() => { setIdTurmaSelecionada(t.id_turma); setDropdownAberto(false); }}><Text style={styles.dropdownItemText}>{t.serie}º {t.turma} - {t.turno}</Text></TouchableOpacity>
            ))}</ScrollView></View>
          )}

          <View style={{ height: 25 }} />

          {modoAluno === 'manual' ? (
            <View>
              <Text style={styles.label}>2. Nome do Aluno:</Text>
              <TextInput style={styles.input} placeholder="Nome Completo" value={nomeAluno} onChangeText={setNomeAluno} />
              <TouchableOpacity style={styles.btnSave} onPress={handleSalvarAluno}><Text style={styles.btnTextSave}>Salvar Aluno</Text></TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#003399" />
                <Text style={styles.infoText}>O Excel deve conter os nomes na primeira coluna (coluna A).</Text>
              </View>
              <TouchableOpacity style={styles.btnExcelLarge} onPress={handleImportarXLSX} disabled={importando}>
                {importando ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="cloud-upload-outline" size={24} color="#FFF" style={{marginRight: 10}} /><Text style={styles.btnTextSave}>Selecionar Arquivo .xlsx</Text></>}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={() => setModalAlunoVisible(false)} style={{marginTop: 20}}><Text style={styles.cancelText}>Cancelar e Voltar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* MODAL TURMA */}
      <Modal animationType="slide" transparent visible={modalTurmaVisible}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nova Turma</Text>
          <TextInput style={styles.input} placeholder="Série (Ex: 8)" keyboardType="numeric" value={novaSerie} onChangeText={setNovaSerie} />
          <TextInput style={styles.input} placeholder="Turma (Ex: B)" maxLength={1} value={novaTurmaLetra} onChangeText={setNovaTurmaLetra} />
          <Text style={styles.label}>Turno:</Text>
          <View style={styles.shiftContainer}>{['Manhã', 'Tarde', 'Noite'].map((t) => (
            <TouchableOpacity key={t} style={[styles.shiftBtn, novoTurno === t && styles.shiftBtnActive]} onPress={() => setNovoTurno(t)}><Text style={[styles.shiftBtnText, novoTurno === t && styles.shiftBtnTextActive]}>{t}</Text></TouchableOpacity>
          ))}</View>
          <TouchableOpacity style={styles.btnSave} onPress={handleSalvarTurma}><Text style={styles.btnTextSave}>Criar Turma</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setModalTurmaVisible(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loading: { flex: 1, justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#003399' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F0F2F5', marginHorizontal: 20, marginBottom: 20, borderRadius: 15, padding: 5 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#FFF', elevation: 3 },
  tabText: { color: '#888', fontWeight: 'bold' },
  tabTextActive: { color: '#003399' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#444' },
  addBtnText: { color: '#003399', fontSize: 11, fontWeight: '900' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#F0F5FF' },
  cardTitle: { fontSize: 17, fontWeight: 'bold' },
  cardSub: { fontSize: 13, color: '#AAA' },
  groupWrapper: { marginBottom: 10 },
  subCard: { backgroundColor: '#F8FAFF', padding: 15, marginHorizontal: 10, borderRadius: 12, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subCardTitle: { fontWeight: 'bold', color: '#003399' },
  subCardShift: { fontSize: 11, color: '#666', textTransform: 'uppercase' },
  subCardText: { color: '#AAA', fontSize: 12 },
  primaryAddBtn: { backgroundColor: '#1E3A8A', paddingVertical: 16, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  primaryAddBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', paddingHorizontal: 15, borderRadius: 12, marginBottom: 20 },
  searchInput: { flex: 1, paddingVertical: 12 },
  alunoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 15 },
  avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#F0F2F5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#003399', fontWeight: 'bold' },
  alunoName: { fontWeight: '700', fontSize: 15 },
  alunoClass: { fontSize: 11, color: '#AAA' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 30, padding: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#003399', marginBottom: 20 },
  input: { backgroundColor: '#F5F7FA', padding: 15, borderRadius: 15, marginBottom: 15 },
  label: { fontWeight: 'bold', marginBottom: 10, color: '#666', fontSize: 13 },
  btnSave: { backgroundColor: '#1E3A8A', padding: 18, borderRadius: 18, alignItems: 'center' },
  btnTextSave: { color: '#FFF', fontWeight: 'bold' },
  cancelText: { textAlign: 'center', color: '#AAA' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F7FA', padding: 15, borderRadius: 15 },
  dropdownButtonActive: { borderWidth: 1, borderColor: '#1E3A8A' },
  dropdownButtonText: { color: '#333' },
  dropdownList: { backgroundColor: '#FFF', borderRadius: 15, marginTop: 5, elevation: 4 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F5FF' },
  dropdownItemText: { color: '#555' },
  shiftContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  shiftBtn: { flex: 1, padding: 12, backgroundColor: '#F5F7FA', borderRadius: 10, alignItems: 'center' },
  shiftBtnActive: { backgroundColor: '#EBF0FF', borderWidth: 1, borderColor: '#1E3A8A' },
  shiftBtnText: { color: '#666', fontWeight: 'bold' },
  shiftBtnTextActive: { color: '#003399' },
  // Estilos do Seletor de Modo
  modeSelector: { flexDirection: 'row', backgroundColor: '#F5F7FA', borderRadius: 12, padding: 4, marginBottom: 25 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: '#FFF', elevation: 2 },
  modeBtnText: { color: '#AAA', fontWeight: 'bold', fontSize: 12 },
  modeBtnTextActive: { color: '#1E3A8A' },
  infoBox: { flexDirection: 'row', backgroundColor: '#EBF0FF', padding: 15, borderRadius: 15, marginBottom: 20, alignItems: 'center' },
  infoText: { color: '#003399', fontSize: 12, flex: 1, marginLeft: 10 },
  btnExcelLarge: { backgroundColor: '#4CAF50', flexDirection: 'row', padding: 20, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }
});
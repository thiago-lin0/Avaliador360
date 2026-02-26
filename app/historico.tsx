import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Imports dos nossos módulos isolados
import { CardCorrecao, FiltroProvas, ListaVazia } from '../components/HistoricoUI';
import { useHistoricoCorrecoes } from '../hooks/useHistoricoCorrecoes';

export default function HistoricoScreen() {
  const router = useRouter();
  
  // 1. Puxa toda a inteligência do Hook
  const { 
    correcoes, provasDisponiveis, provaSelecionada, 
    loading, refreshing, onRefresh, handleSelecionarProva 
  } = useHistoricoCorrecoes();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico da Unidade</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
          <Ionicons name="sync" size={22} color="#2B428C" />
        </TouchableOpacity>
      </View>

      {/* FILTROS (Componentizado) */}
      <FiltroProvas 
        provas={provasDisponiveis} 
        selecionada={provaSelecionada} 
        onSelect={handleSelecionarProva} 
      />

      {/* LISTAGEM */}
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2B428C" /></View>
      ) : (
        <FlatList
          data={correcoes}
          keyExtractor={(item) => String(item.id_folha)}
          renderItem={({ item }) => <CardCorrecao item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<ListaVazia />}
        />
      )}
    </SafeAreaView>
  );
}

// Apenas os estilos estruturais da tela principal
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  backBtn: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12 },
  list: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
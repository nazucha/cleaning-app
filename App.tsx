import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { submitForm } from './services/sheetsService';

interface AirConditioner {
  maker: string;
  model: string;
  type: string;
  hasCleaningFunction: boolean;
  height: string;
  installation: string;
  options: string[];
}

interface FormData {
  inquiryType: string;
  customerName: string;
  customerNameKana: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  numberOfUnits: number;
  airConditioners: AirConditioner[];
  otherCleaning: string;
  parking: boolean;
  preferredDates: string[];
  notes: string;
}

export default function App() {
  const [formData, setFormData] = useState<FormData>({
    inquiryType: 'エアコン',
    customerName: '',
    customerNameKana: '',
    postalCode: '',
    address: '',
    phone: '',
    email: '',
    numberOfUnits: 1,
    airConditioners: [{
      maker: '',
      model: '',
      type: '',
      hasCleaningFunction: false,
      height: '',
      installation: '',
      options: [],
    }],
    otherCleaning: '',
    parking: false,
    preferredDates: ['', '', ''],
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAirConditioner = (index: number, field: keyof AirConditioner, value: any) => {
    const updated = [...formData.airConditioners];
    updated[index] = { ...updated[index], [field]: value };
    updateFormData('airConditioners', updated);
  };

  const addAirConditioner = () => {
    if (formData.airConditioners.length < 4) {
      updateFormData('airConditioners', [
        ...formData.airConditioners,
        {
          maker: '',
          model: '',
          type: '',
          hasCleaningFunction: false,
          height: '',
          installation: '',
          options: [],
        }
      ]);
      updateFormData('numberOfUnits', formData.numberOfUnits + 1);
    }
  };

  const removeAirConditioner = (index: number) => {
    if (formData.airConditioners.length > 1) {
      const updated = formData.airConditioners.filter((_, i) => i !== index);
      updateFormData('airConditioners', updated);
      updateFormData('numberOfUnits', updated.length);
    }
  };

  const handleSubmit = async () => {
    if (!formData.customerName || !formData.phone) {
      Alert.alert('エラー', 'お客様名と連絡先は必須項目です');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitForm(formData);
      Alert.alert('送信完了', 'お問い合わせを受け付けました。ありがとうございます。');
      setFormData({
        inquiryType: 'エアコン',
        customerName: '',
        customerNameKana: '',
        postalCode: '',
        address: '',
        phone: '',
        email: '',
        numberOfUnits: 1,
        airConditioners: [{
          maker: '',
          model: '',
          type: '',
          hasCleaningFunction: false,
          height: '',
          installation: '',
          options: [],
        }],
        otherCleaning: '',
        parking: false,
        preferredDates: ['', '', ''],
        notes: '',
      });
    } catch (error) {
      Alert.alert('エラー', '送信に失敗しました。もう一度お試しください。');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>清掃サービス問い合わせ</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>お客様情報</Text>
          
          <Text style={styles.label}>問い合わせ内容</Text>
          <TextInput
            style={styles.input}
            value={formData.inquiryType}
            onChangeText={(text) => updateFormData('inquiryType', text)}
            placeholder="エアコン"
          />

          <Text style={styles.label}>お客様名（漢字）*</Text>
          <TextInput
            style={styles.input}
            value={formData.customerName}
            onChangeText={(text) => updateFormData('customerName', text)}
            placeholder="山田太郎"
          />

          <Text style={styles.label}>お客様名（フリガナ）</Text>
          <TextInput
            style={styles.input}
            value={formData.customerNameKana}
            onChangeText={(text) => updateFormData('customerNameKana', text)}
            placeholder="ヤマダタロウ"
          />

          <Text style={styles.label}>郵便番号</Text>
          <TextInput
            style={styles.input}
            value={formData.postalCode}
            onChangeText={(text) => updateFormData('postalCode', text)}
            placeholder="〒110-0015"
          />

          <Text style={styles.label}>住所（作業エリア）</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => updateFormData('address', text)}
            placeholder="東京都..."
            multiline
            numberOfLines={2}
          />

          <Text style={styles.label}>連絡先*</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            placeholder="03-1234-5678"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            placeholder="example@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>エアコン情報</Text>
          
          <Text style={styles.label}>台数: {formData.numberOfUnits}台</Text>
          
          {formData.airConditioners.map((ac, index) => (
            <View key={index} style={styles.acCard}>
              <Text style={styles.acTitle}>{index + 1}台目</Text>
              
              <Text style={styles.label}>メーカー</Text>
              <TextInput
                style={styles.input}
                value={ac.maker}
                onChangeText={(text) => updateAirConditioner(index, 'maker', text)}
                placeholder="ダイキン"
              />

              <Text style={styles.label}>型番</Text>
              <TextInput
                style={styles.input}
                value={ac.model}
                onChangeText={(text) => updateAirConditioner(index, 'model', text)}
                placeholder="型番を入力"
              />

              <Text style={styles.label}>エアコン種類</Text>
              <TextInput
                style={styles.input}
                value={ac.type}
                onChangeText={(text) => updateAirConditioner(index, 'type', text)}
                placeholder="壁掛けおそうじ機能付き"
              />

              <Text style={styles.label}>高さ</Text>
              <TextInput
                style={styles.input}
                value={ac.height}
                onChangeText={(text) => updateAirConditioner(index, 'height', text)}
                placeholder="2ｍ前後"
              />

              <Text style={styles.label}>設置状況</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={ac.installation}
                onChangeText={(text) => updateAirConditioner(index, 'installation', text)}
                placeholder="上部・右側10cm以上隙間なし"
                multiline
                numberOfLines={2}
              />

              {formData.airConditioners.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeAirConditioner(index)}
                >
                  <Text style={styles.removeButtonText}>この台を削除</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {formData.airConditioners.length < 4 && (
            <TouchableOpacity style={styles.addButton} onPress={addAirConditioner}>
              <Text style={styles.addButtonText}>+ エアコンを追加（最大4台）</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>その他</Text>
          
          <Text style={styles.label}>その他おそうじ</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.otherCleaning}
            onChangeText={(text) => updateFormData('otherCleaning', text)}
            placeholder="風呂釜クリーニングなど"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>駐車場の有無</Text>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => updateFormData('parking', !formData.parking)}
          >
            <Text style={styles.checkboxText}>
              {formData.parking ? '✓ あり' : '☐ なし'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>ご希望日・曜日・時間</Text>
          {formData.preferredDates.map((date, index) => (
            <TextInput
              key={index}
              style={styles.input}
              value={date}
              onChangeText={(text) => {
                const updated = [...formData.preferredDates];
                updated[index] = text;
                updateFormData('preferredDates', updated);
              }}
              placeholder={`希望日${index + 1}`}
            />
          ))}

          <Text style={styles.label}>備考</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => updateFormData('notes', text)}
            placeholder="その他のご要望など"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? '送信中...' : '送信する'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  acCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  acTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4CAF50',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#f44336',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  checkbox: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkboxText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

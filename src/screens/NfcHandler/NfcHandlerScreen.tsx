import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import { handleNfcTag, subscribeToNfcLinks, extractNfcTagIdFromUrl } from '../../utils/nfcHandler';
import { Linking } from 'react-native';
import type { NfcHandleResult } from '../../utils/nfcHandler';

interface NfcHandlerScreenProps {
  navigation: any;
  route: any;
}

export default function NfcHandlerScreen({ navigation, route }: NfcHandlerScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if tagId was passed via route params
    const tagId = route.params?.tagId;
    
    if (tagId) {
      handleNfcTagFromId(tagId);
    } else {
      // Check for initial URL (app launched via NFC)
      checkInitialUrl();
      
      // Subscribe to NFC links while app is running
      const subscription = subscribeToNfcLinks(handleNfcResult);
      
      return () => {
        subscription.remove();
      };
    }
  }, []);

  const checkInitialUrl = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const tagId = extractNfcTagIdFromUrl(initialUrl);
        if (tagId) {
          handleNfcTagFromId(tagId);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking initial URL:', error);
    }
    
    // No NFC tag found, navigate to binder list
    setLoading(false);
    navigation.replace('BinderList');
  };

  const handleNfcTagFromId = async (tagId: string) => {
    try {
      setLoading(true);
      const result = await handleNfcTag(tagId);
      handleNfcResult(result);
    } catch (error: any) {
      setError(error.message || 'Failed to process NFC tag');
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to process NFC tag', [
        { text: 'OK', onPress: () => navigation.replace('BinderList') },
      ]);
    }
  };

  const handleNfcResult = (result: NfcHandleResult) => {
    setLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Failed to process NFC tag');
      Alert.alert('Error', result.error || 'Failed to process NFC tag', [
        { text: 'OK', onPress: () => navigation.replace('BinderList') },
      ]);
      return;
    }

    if (result.isNewTag) {
      // New tag - navigate to questionnaire
      navigation.replace('Questionnaire', { nfcTagId: result.tagId });
    } else if (result.binder) {
      // Existing tag - navigate to binder detail
      navigation.replace('BinderDetail', { binderId: result.binder.id });
    } else {
      // Fallback - navigate to binder list
      navigation.replace('BinderList');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Processing NFC tag...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>NFC Handler</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    marginTop: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});







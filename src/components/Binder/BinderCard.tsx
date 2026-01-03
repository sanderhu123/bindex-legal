import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import type { Binder } from '../../types';
import ProgressBar from '../Progress/ProgressBar';
import { getSetLogoByName } from '../../data/pokemonEras';

interface BinderCardProps {
  binder: Binder;
  completionPercentage: number;
  totalCards: number;
  onPress: () => void;
  onDelete?: () => void;
}

export default function BinderCard({ binder, completionPercentage, totalCards, onPress, onDelete }: BinderCardProps) {
  const [logoError, setLogoError] = useState(false);
  
  // Get set logo URL for master-set binders
  const setLogoUrl = binder.collectionMode === 'master-set' && binder.set 
    ? getSetLogoByName(binder.set) 
    : null;

  // Format collection mode for display
  const getCollectionModeLabel = (mode: string): string => {
    switch (mode) {
      case 'master-set':
        return 'Master Set';
      case 'region':
        return 'Region';
      case 'custom':
        return 'Custom';
      default:
        return mode;
    }
  };

  // Get subtitle based on collection mode
  const getSubtitle = (): string => {
    if (binder.collectionMode === 'master-set' && binder.set) {
      return binder.set;
    } else if (binder.collectionMode === 'region' && binder.region) {
      return `${binder.region} Region`;
    } else if (binder.collectionMode === 'custom') {
      return 'Custom Collection';
    }
    return '';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {binder.name}
            </Text>
            {binder.nfcTagId && (
              <View style={styles.nfcBadge}>
                <Text style={styles.nfcText}>NFC</Text>
              </View>
            )}
          </View>
          
          {/* Set logo for master-set binders - after binder name */}
          {binder.collectionMode === 'master-set' && setLogoUrl && !logoError && (
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: setLogoUrl }}
                style={styles.setLogo}
                resizeMode="contain"
                onError={() => setLogoError(true)}
              />
            </View>
          )}
          
          {onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.subtitle} numberOfLines={1}>
          {getCollectionModeLabel(binder.collectionMode)}
          {getSubtitle() && ` • ${getSubtitle()}`}
        </Text>

        <ProgressBar
          current={binder.ownedCards}
          total={totalCards}
          percentage={completionPercentage}
          format="ratio"
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  content: {
    padding: 16,
  },
  logoContainer: {
    marginRight: 8,
  },
  setLogo: {
    width: 115,
    height: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  nfcBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  nfcText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
});



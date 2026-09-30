import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, addDoc, deleteDoc, query, where, onSnapshot, serverTimestamp } from '@firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { useTheme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import { fetchMealReports } from '../utils/mealInfo';

function AddUpcomingFlightForm({ user }) {
  const { colors } = useTheme();
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = airline && departureAirport && arrivalAirport;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'upcomingFlights'), {
        userId: user.uid,
        airline,
        flightNumber: flightNumber || null,
        date: date || null,
        departureAirport: departureAirport.toUpperCase(),
        arrivalAirport: arrivalAirport.toUpperCase(),
        createdAt: serverTimestamp(),
      });
      setAirline('');
      setFlightNumber('');
      setDate('');
      setDepartureAirport('');
      setArrivalAirport('');
    } catch {
      // best-effort — the form just keeps its values so the user can retry
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 10 }}>
        Add an upcoming flight
      </Text>
      {[
        ['Airline', airline, setAirline],
        ['Flight number (optional)', flightNumber, setFlightNumber],
        ['Date', date, setDate],
        ['Departure airport', departureAirport, setDepartureAirport],
        ['Arrival airport', arrivalAirport, setArrivalAirport],
      ].map(([placeholder, value, setter]) => (
        <TextInput
          key={placeholder}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={setter}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 9,
            fontSize: 13,
            marginBottom: 8,
            color: colors.textPrimary,
            backgroundColor: colors.background,
          }}
        />
      ))}
      <Pressable
        onPress={submit}
        disabled={busy || !canSubmit}
        style={{
          backgroundColor: colors.accentFill,
          paddingVertical: 11,
          borderRadius: 10,
          alignItems: 'center',
          opacity: busy || !canSubmit ? 0.5 : 1,
          marginTop: 4,
        }}
      >
        <Text style={{ color: colors.onAccentFill, fontSize: 14, fontWeight: '500' }}>{busy ? 'Adding...' : 'Add'}</Text>
      </Pressable>
    </View>
  );
}

function MealReportsPanel({ airline }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMealReports(airline).then((r) => {
      if (!cancelled) {
        setReports(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [airline]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 14, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accentText} />
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 8 }}>
        No meal reports yet for {airline} — be the first to log one after this flight.
      </Text>
    );
  }

  return (
    <View style={{ paddingVertical: 8, gap: 10 }}>
      {reports.map((r, i) => (
        <View key={i}>
          <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{r.mealDescription}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
            {r.username} · {r.route}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function UpcomingFlightsScreen({ user, onBack }) {
  const { colors } = useTheme();
  const [flights, setFlights] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!firebaseReady) return;
    const q = query(collection(db, 'upcomingFlights'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setFlights(docs);
    });
    return unsubscribe;
  }, [user.uid]);

  const remove = (id) => {
    deleteDoc(doc(db, 'upcomingFlights', id)).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Upcoming flights" onBack={onBack} />
      <FlatList
        data={flights}
        keyExtractor={(f) => f.id}
        ListHeaderComponent={<AddUpcomingFlightForm user={user} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No upcoming flights yet"
            subtitle="Add one above to see what meal others got on that airline."
          />
        }
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          return (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Pressable
                onPress={() => setExpandedId(expanded ? null : item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
                    {item.departureAirport} → {item.arrivalAirport}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {item.airline}
                    {item.date ? ` · ${item.date}` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                  <Pressable onPress={() => remove(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </Pressable>
              {expanded && <MealReportsPanel airline={item.airline} />}
            </View>
          );
        }}
      />
    </View>
  );
}

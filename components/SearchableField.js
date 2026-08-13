import { View, Text, TextInput, Pressable } from 'react-native';
import { useTheme } from '../theme';

// Search-assisted text input, not a strict picker — matches from `options`
// show as suggestions while typing, but any free text is still accepted on
// submit (mirrors how aircraftType has always worked: curated list for
// convenience, raw text as the real source of truth). Suggestions are
// derived purely from the current value rather than focus/blur state —
// this app dropped RN's Modal after it didn't close reliably on-device, and
// blur-driven visibility has similar race-condition risk, so this stays
// plain and predictable: show matches while the text is a partial match,
// hide once it exactly matches a suggestion (i.e. right after picking one).
export default function SearchableField({
  placeholder,
  value,
  onChangeText,
  options,
  getLabel,
  getSubtitle,
  getSearchText,
  maxSuggestions = 5,
}) {
  const { colors } = useTheme();

  const query = (value || '').trim().toLowerCase();
  const isExactMatch = options.some((opt) => getLabel(opt).toLowerCase() === query);
  const matches =
    query.length > 0 && !isExactMatch
      ? options
          .filter((opt) => (getSearchText ? getSearchText(opt) : getLabel(opt)).toLowerCase().includes(query))
          .slice(0, maxSuggestions)
      : [];

  return (
    <View style={{ marginBottom: 10 }}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 14,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
        }}
      />
      {matches.length > 0 && (
        <View
          style={{
            marginTop: 4,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          {matches.map((opt, i) => (
            <Pressable
              key={i}
              onPress={() => onChangeText(getLabel(opt))}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderBottomWidth: i === matches.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{getLabel(opt)}</Text>
              {getSubtitle && <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>{getSubtitle(opt)}</Text>}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

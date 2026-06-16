package store

import (
	"database/sql/driver"
	"encoding/json"
)

// JSONMap and JSONArray allow GORM to scan and write MySQL JSON columns.
type JSONMap map[string]any
type JSONArray []any

func (j JSONMap) Value() (driver.Value, error)   { return json.Marshal(j) }
func (j *JSONMap) Scan(value any) error          { return scanJSON(value, j) }
func (j JSONArray) Value() (driver.Value, error) { return json.Marshal(j) }
func (j *JSONArray) Scan(value any) error        { return scanJSON(value, j) }

func scanJSON[T ~map[string]any | ~[]any](value any, dest *T) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		if s, ok := value.(string); ok {
			bytes = []byte(s)
		}
	}
	if len(bytes) == 0 {
		return nil
	}
	return json.Unmarshal(bytes, dest)
}

func toArray(v any) JSONArray {
	if a, ok := v.([]any); ok {
		return a
	}
	return JSONArray{}
}

func toMap(v any) JSONMap {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return JSONMap{}
}

func str(v any, fallback string) string {
	if s, ok := v.(string); ok && s != "" {
		return s
	}
	return fallback
}

func ptrString(v any) *string {
	if s, ok := v.(string); ok && s != "" {
		return &s
	}
	return nil
}

func ptrInt64(v any) *int64 {
	switch n := v.(type) {
	case float64:
		i := int64(n)
		return &i
	case int64:
		return &n
	case int:
		i := int64(n)
		return &i
	default:
		return nil
	}
}

func intValue(v any, fallback int) int {
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	default:
		return fallback
	}
}

# database.py
from supabase import create_client
import os

SUPABASE_URL = os.getenv("https://supabase.com/dashboard/project/vjmwbgdwpwbgxfsjmrui")
SUPABASE_KEY = os.getenv("sbp_e93563996ad5ef72e91f2766989ebea2c9bf3ddd")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 예: 데이터 저장
def save_data(table, data):
    return supabase.table(table).insert(data).execute()

# 예: 데이터 읽기
def get_data(table):
    return supabase.table(table).select("*").execute()
```

### 3. Render 환경변수 추가
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
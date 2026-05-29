import os
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

# ✅ LOAD .env.local EXPLICITLY
load_dotenv('.env.local')

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # ✅ Backend script uses service role

if not url or not key:
    raise ValueError("Missing Supabase credentials in .env file")

supabase: Client = create_client(url, key)

#  Campaign Configuration
START_DATE = datetime(2026, 6, 5)
VALVES_PER_DAY = 30
CREW_NAME = "Station Valve Campaign Crew"
PRIORITY = "medium"

def get_station_valves():
    """Fetch all non-wellhead (station) valves"""
    print("🔍 Fetching station valves (is_wellhead_valve = FALSE)...")
    
    response = supabase.table("assets").select("""
        id, tag_number, location_code, sct_code, service_type, criticality
    """).eq("is_wellhead_valve", False).eq("asset_type", "valve").is_("deleted_at", None).order("location_code").order("tag_number").execute()
    
    if response.data:
        print(f"✅ Found {len(response.data)} station valves")
        return response.data
    else:
        print("❌ No station valves found! Check filter criteria.")
        return []

def create_campaign_work_orders(valves):
    """Create work orders with 30 valves per day"""
    print(f"\n📅 Creating campaign starting {START_DATE.strftime('%Y-%m-%d')}...")
    print(f"🔧 {VALVES_PER_DAY} valves per day")
    print(f" Crew: {CREW_NAME}\n")
    
    current_date = START_DATE
    valves_assigned = 0
    wo_count = 0
    total_valves = len(valves)
    
    for i in range(0, total_valves, VALVES_PER_DAY):
        chunk = valves[i:i + VALVES_PER_DAY]
        due_date = current_date.strftime("%Y-%m-%d")
        
        wo_number = f"STN-WO-{START_DATE.year}-{wo_count + 1:03d}"
        
        wo_data = {
            "work_order_number": wo_number,
            "title": f"Station Valve Maintenance - {due_date}",
            "description": f"Routine maintenance for {len(chunk)} station valves. Campaign day {wo_count + 1}.",
            "priority": PRIORITY,
            "status": "pending",
            "assigned_crew": CREW_NAME,
            "due_date": due_date,
            "scheduled_date": due_date,
            "estimated_hours": len(chunk) * 0.5,  # ~30 mins per valve
            "notes": f"Auto-generated station valve campaign. Target: {VALVES_PER_DAY} valves/day"
        }
        
        wo_response = supabase.table("work_orders").insert(wo_data).execute()
        
        if wo_response.data:
            wo_id = wo_response.data[0]["id"]
            wo_count += 1
            
            # Create work_order_items for each valve
            items = [
                {
                    "work_order_id": wo_id,
                    "asset_id": valve["id"],
                    "status": "pending",
                    "task_description": f"Service station valve {valve['tag_number']}"
                }
                for valve in chunk
            ]
            
            items_response = supabase.table("work_order_items").insert(items).execute()
            
            if items_response.data:
                valves_assigned += len(chunk)
                progress = (valves_assigned / total_valves) * 100
                print(f"✅ WO #{wo_count:03d}: {wo_number} | {len(chunk):2d} valves | {due_date} | {progress:5.1f}%")
            else:
                print(f"❌ Failed to create items for {wo_number}: {items_response.error}")
        else:
            print(f"❌ Failed to create WO {wo_number}: {wo_response.error}")
        
        # Move to next day
        current_date += timedelta(days=1)
    
    # Summary
    print("\n" + "="*70)
    print(" STATION VALVE CAMPAIGN CREATED!")
    print("="*70)
    print(f"📊 Total Work Orders: {wo_count}")
    print(f"🔧 Total Valves Assigned: {valves_assigned} / {total_valves}")
    print(f"📅 Start Date: {START_DATE.strftime('%Y-%m-%d')}")
    print(f"📅 End Date: {(current_date - timedelta(days=1)).strftime('%Y-%m-%d')}")
    print(f"⚙️  Daily Rate: {VALVES_PER_DAY} valves/day")
    print(f"👷 Crew: {CREW_NAME}")
    print("="*70)

def main():
    try:
        valves = get_station_valves()
        if not valves:
            print("\n⚠️ No station valves found. Exiting.")
            return
        
        # Campaign preview
        days_needed = (len(valves) // VALVES_PER_DAY) + (1 if len(valves) % VALVES_PER_DAY else 0)
        end_date = START_DATE + timedelta(days=days_needed - 1)
        
        print("\n" + "="*70)
        print(" CAMPAIGN SUMMARY")
        print("="*70)
        print(f"🔧 Station Valves: {len(valves)}")
        print(f"📅 Duration: {days_needed} days")
        print(f"📆 Period: {START_DATE.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        print(f"⚙️  Rate: {VALVES_PER_DAY} valves/day")
        print(f"👷 Crew: {CREW_NAME}")
        print("="*70)
        
        confirm = input("\n⚠️  Create work orders? (yes/no): ").lower().strip()
        if confirm not in ['yes', 'y']:
            print("🛑 Operation cancelled.")
            return
            
        create_campaign_work_orders(valves)
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
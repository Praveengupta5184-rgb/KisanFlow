"""Generate deterministic demo queue snapshots, bookings and payments CSV data."""
from pathlib import Path
import numpy as np, pandas as pd
def main():
 rng=np.random.default_rng(42);out=Path(__file__).parents[1]/'demo-data';out.mkdir(exist_ok=True);times=pd.date_range('2026-01-01',periods=24*30,freq='h');queue=np.maximum(0,(25+18*np.sin(times.hour/24*6.28)+rng.normal(0,5,len(times))).round()).astype(int)
 pd.DataFrame({'centreId':'centre-001','timestamp':times,'pendingCount':queue,'processedCount':rng.integers(2,15,len(times)),'activeCounters':rng.integers(1,4,len(times))}).to_csv(out/'queue_snapshots.csv',index=False)
 pd.DataFrame({'bookingId':[f'b{i:05}' for i in range(500)],'centreId':'centre-001','bookingDate':rng.choice(times.date,500),'produceQuantity':rng.uniform(50,800,500).round(2)}).to_csv(out/'bookings.csv',index=False)
 completed=pd.date_range('2026-01-01',periods=200,freq='6h');pd.DataFrame({'bookingId':[f'b{i:05}' for i in range(200)],'completionTime':completed,'paymentReleasedTime':completed+pd.to_timedelta(rng.integers(12,96,200),unit='h')}).to_csv(out/'payments.csv',index=False)
 print(f'Wrote demo data to {out}')
if __name__=='__main__': main()

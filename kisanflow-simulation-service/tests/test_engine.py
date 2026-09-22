from app.engine import mmc_wait_minutes

def test_queue_wait_is_positive_and_zero_counter_is_rejected():
    assert mmc_wait_minutes(20,2,10)[0] >= 0
    try: mmc_wait_minutes(20,0,10)
    except ValueError: pass
    else: assert False

import unittest
from swarm_coordinator import swarm, validate_evidence

class SwarmTests(unittest.TestCase):
    def test_concurrent_agents(self):
        fn = lambda name: lambda: {'agent': name, 'findings': ['documented'], 'sources': ['https://example.org/docs']}
        out = swarm({'CHINA_CIPS': fn('china'), 'BRAZIL_PIX': fn('brazil')})
        self.assertEqual(len(out['results']), 2)
        self.assertEqual(out['live_transfers'], 0)
    def test_reject_missing_source(self):
        with self.assertRaises(ValueError): validate_evidence({'agent':'a','findings':['x'],'sources':[]})
    def test_reject_insecure_url(self):
        with self.assertRaises(ValueError): validate_evidence({'agent':'a','findings':['x'],'sources':['http://example.org']})
    def test_isolate_failed_agent(self):
        out=swarm({'MEXICO_SPEI':lambda:1,'INDIA_UPI':lambda:{'agent':'india','findings':['x'],'sources':['https://npci.org.in/']}})
        self.assertIn('MEXICO_SPEI',out['errors'])
        self.assertIn('INDIA_UPI',out['results'])
    def test_reject_unknown_track(self):
        with self.assertRaises(ValueError): swarm({'UNKNOWN':lambda:{}})

if __name__ == '__main__': unittest.main()

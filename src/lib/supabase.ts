import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnnhdbapoqlkgijderkh.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJubmhkYmFwb3Fsa2dpamRlcmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTA0ODcsImV4cCI6MjA3MjEyNjQ4N30.t72KIFgB4Jps8dAdnclDKZIFITL9tq1PJyP5QkQUcx8';

export const supabase = createClient(supabaseUrl, supabaseKey);
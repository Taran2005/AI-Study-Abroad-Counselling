-- ============================================================
-- Seed Data for Admin Analytics Dashboard
-- Populates 30 days of mock analytics for testing charts
-- ============================================================

DO $$
DECLARE
    i INT;
    r_conv_id UUID;
    r_date TIMESTAMPTZ;
    v_status TEXT;
    v_outcome TEXT;
    v_classification TEXT;
    v_score INT;
    names TEXT[] := ARRAY['Aarav Patel', 'Priya Sharma', 'Rohan Gupta', 'Neha Singh', 'Vikram Desai', 'Anjali Mehta', 'Rahul Verma', 'Kavita Iyer', 'Amit Kumar', 'Sanya Kapoor'];
    countries TEXT[] := ARRAY['UK', 'Ireland'];
    courses TEXT[] := ARRAY['Data Science', 'MBA', 'Computer Science', 'Business Administration', 'Marketing'];
    levels TEXT[] := ARRAY['PG', 'UG'];
    tests TEXT[] := ARRAY['IELTS', 'PTE', 'TOEFL'];
    statuses TEXT[] := ARRAY['completed', 'completed', 'completed', 'abandoned'];
    classifications TEXT[] := ARRAY['hot', 'hot', 'warm', 'warm', 'cold'];
    outbound_outcomes TEXT[] := ARRAY['interested', 'callback_requested', 'voicemail', 'no_answer', 'not_interested', 'interested'];
BEGIN
    -- 1. Generate 60 Inbound Conversations and Student Profiles over the last 30 days
    FOR i IN 1..60 LOOP
        -- Generate random date in the last 30 days
        r_date := now() - ((random() * 30)::int || ' days')::interval - ((random() * 24)::int || ' hours')::interval;

        -- Insert Student Profile
        INSERT INTO public.student_profiles (
            name, phone, target_countries, course_interest, education_level,
            test_type, test_score, budget_range, created_at
        ) VALUES (
            names[1 + (random() * 9)::int],
            '+9198' || lpad((random() * 99999999)::int::text, 8, '0'),
            ARRAY[countries[1 + (random() * 1)::int]],
            courses[1 + (random() * 4)::int],
            levels[1 + (random() * 1)::int],
            tests[1 + (random() * 2)::int],
            (6.0 + (random() * 2.5))::numeric(2,1)::text,
            '15-20 lakh',
            r_date
        );

        -- Insert Conversation
        v_status := statuses[1 + (random() * 3)::int];
        INSERT INTO public.conversations (
            started_at, ended_at, duration_secs, status, created_at, extracted_data
        ) VALUES (
            r_date,
            r_date + ((120 + random() * 480)::int || ' seconds')::interval,
            (120 + random() * 480)::int,
            v_status::public.conversation_status,
            r_date,
            jsonb_build_object('student_name', names[1 + (random() * 9)::int], 'target_country', countries[1 + (random() * 1)::int])
        ) RETURNING id INTO r_conv_id;

        -- Insert Lead Score if completed
        IF v_status = 'completed' THEN
            v_classification := classifications[1 + (random() * 4)::int];
            
            -- Generate realistic sub-scores based on classification
            IF v_classification = 'hot' THEN 
                v_score := 85 + (random() * 10)::int;
            ELSIF v_classification = 'warm' THEN 
                v_score := 50 + (random() * 20)::int;
            ELSE 
                v_score := 20 + (random() * 20)::int;
            END IF;

            INSERT INTO public.lead_scores (
                conversation_id, intent_score, financial_score, timeline_score, classification, created_at
            ) VALUES (
                r_conv_id, 
                v_score, 
                GREATEST(0, v_score - (random()*10)::int), 
                LEAST(100, v_score + (random()*10)::int), 
                v_classification::public.lead_classification, 
                r_date
            );
        END IF;

    END LOOP;

    -- 2. Generate 40 Outbound Calls over the last 15 days
    FOR i IN 1..40 LOOP
        r_date := now() - ((random() * 15)::int || ' days')::interval;
        v_outcome := outbound_outcomes[1 + (random() * 5)::int];
        
        INSERT INTO public.outbound_calls (
            student_name, student_phone, call_type, call_status, call_outcome,
            duration_secs, initiated_at, ended_at, created_at
        ) VALUES (
            names[1 + (random() * 9)::int],
            '+9198765' || lpad((random() * 99999)::int::text, 5, '0'),
            'follow_up',
            'completed',
            v_outcome,
            (30 + random() * 180)::int,
            r_date,
            r_date + ((30 + random() * 180)::int || ' seconds')::interval,
            r_date
        );
    END LOOP;
END $$;

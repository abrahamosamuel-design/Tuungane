-- Move public_profiles (business profiles) into profile_services (personal services)
DO $$
BEGIN
    INSERT INTO public.profile_services (
        user_profile_id,
        title,
        category_slug,
        subcategory,
        description,
        district,
        town,
        active
    )
    SELECT 
        owner_id,
        name,
        COALESCE(category_slug, 'other'),
        COALESCE(subcategory, 'other'),
        COALESCE(bio, ''),
        district,
        town,
        true
    FROM public.public_profiles pp
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profile_services ps 
        WHERE ps.user_profile_id = pp.owner_id 
          AND ps.title = pp.name
    );
    
    -- Update the user's profile to ensure they are marked as a provider
    UPDATE public.profiles p
    SET is_provider = true
    FROM public.public_profiles pp
    WHERE p.id = pp.owner_id AND p.is_provider = false;
END $$;

const supabase = require("../config/supabase");

async function testStatistics() {
  try {
    console.log("🔍 Test de récupération des données...\n");

    // Test 1: Vérifier les infrastructures
    console.log("1️⃣  Test - Infrastructures par type:");
    const { data: infraData, error: infraError } = await supabase
      .from("infrastructures")
      .select("type")
      .limit(100);

    if (infraError) {
      console.error("❌ Erreur:", infraError);
    } else {
      console.log(`   ✅ ${infraData?.length || 0} infrastructures trouvées`);
      if (infraData && infraData.length > 0) {
        const grouped = infraData.reduce((acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {});
        console.log("   Résumé par type:");
        Object.entries(grouped).forEach(([type, count]) => {
          console.log(`      - ${type}: ${count}`);
        });
      }
    }

    console.log("\n2️⃣  Test - Propositions:");
    const { data: propData, error: propError } = await supabase
      .from("propositions")
      .select("id, quartier");

    if (propError) {
      console.error("❌ Erreur:", propError);
    } else {
      console.log(`   ✅ ${propData?.length || 0} propositions trouvées`);
    }

    console.log("\n3️⃣  Test - Table communes:");
    const { data: communesData, error: communesError } = await supabase
      .from("communes")
      .select("id, nom, departement_id")
      .limit(5);

    if (communesError) {
      console.error("❌ Erreur:", communesError);
    } else {
      console.log(`   ✅ ${communesData?.length || 0} communes trouvées`);
      communesData?.forEach((c) => {
        console.log(`      - ${c.nom} (dept_id: ${c.departement_id})`);
      });
    }

    console.log("\n4️⃣  Test - Table departements:");
    const { data: deptsData, error: deptsError } = await supabase
      .from("departements")
      .select("id, nom")
      .limit(5);

    if (deptsError) {
      console.error("❌ Erreur:", deptsError);
    } else {
      console.log(`   ✅ ${deptsData?.length || 0} départements trouvés`);
    }

    console.log("\n5️⃣  Test - Vérifier colonnes propositions:");
    const { data: propColumnsTest } = await supabase
      .from("propositions")
      .select("*")
      .limit(1);

    if (propColumnsTest && propColumnsTest.length > 0) {
      console.log("   Colonnes disponibles:");
      Object.keys(propColumnsTest[0]).forEach((key) => {
        console.log(`      - ${key}`);
      });
    } else {
      console.log("   ❌ Aucune proposition pour tester les colonnes");
    }

    console.log(
      "\n✅ Test terminé. Vérifiez les données ci-dessus pour identifier le problème.",
    );
  } catch (error) {
    console.error("❌ Erreur générale:", error.message);
  }
}

testStatistics();

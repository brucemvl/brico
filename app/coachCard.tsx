import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import React from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import modifier from "../assets/icons/modifier.png";
import ScoreRing from "./scoreRing";



type Coach = {

    score:number;

    level:string;

    title:string;

    subtitle:string;

    strengths:string[];

    improvements:string[];

    action?:{

        type:string;

        requestId?:string;

        label:string;

    }

};

type Props = {

    coach:Coach;
    firstName: string;
    avatar: string;

    onAction?:()=>void;

};

export default function CoachCard({

    coach,
    firstName,
    avatar,
    onAction

}:Props){

    const progressColor =
        coach.score >= 90
            ? "#23c34b"
            : coach.score >= 75
            ? "#1aa425"
            : coach.score >= 60
            ? "#FFB800"
            : "#FF6B6B";

              const router = useRouter();
              
            

    return(

        <LinearGradient

            colors={["#30a590","#1a5b4f"]}

            style={styles.container}

        >

<View style={{flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>
            <Text style={styles.header}>

                Bonjour {firstName}

            </Text>
            <Image source={{uri: avatar}} style={{width: 70, height: 70, borderRadius: 35, marginRight: 5}}/>
            <TouchableOpacity
                          onPress={() => router.push({ pathname: "/profileClient" })}
                          style={styles.profileButton}
                          accessible
                          accessibilityRole="button"
                          accessibilityLabel="Modifier profl"
                          accessibilityHint={`Modifier mon profil`}
                        >
                          <Image source={modifier} style={{ width: 20, height: 20 }} />
                        </TouchableOpacity>
            </View>

            <View style={styles.scoreRow}>

<View style={{alignItems: "center", gap: 5}}>
                <ScoreRing

    score={coach.score}

    color={progressColor}

/>
<Text style={styles.level}>

                        {coach.level}

                    </Text>
                    </View>

                <View style={{flex:1}}>

                    

                    <Text style={styles.title}>

                        {coach.title}

                    </Text>

                    <Text style={styles.subtitle}>

                        {coach.subtitle}

                    </Text>

                </View>

            </View>

            {coach.strengths.length > 0 && (

                <View style={styles.section}>

                    <Text style={styles.sectionTitle}>

                        Ce qui est déjà bien

                    </Text>

                    {coach.strengths.map((item,index)=>(

                        <Text
                            key={index}
                            style={styles.goodItem}
                        >

                            ✓ {item}

                        </Text>

                    ))}

                </View>

            )}

            {coach.improvements.length > 0 && (

                <View style={styles.section}>

                    <Text style={styles.sectionTitle}>

                        À améliorer

                    </Text>

                    {coach.improvements.map((item,index)=>(

                        <Text
                            key={index}
                            style={styles.badItem}
                        >

                            ⚠ {item}

                        </Text>

                    ))}

                </View>

            )}

            {coach.action && (

                <TouchableOpacity
                    style={styles.button}
                    onPress={onAction}
                >

                    <Text style={styles.buttonText}>

                        {coach.action.label}

                    </Text>

                </TouchableOpacity>

            )}

        </LinearGradient>

    );

}

const styles = StyleSheet.create({

container:{

width: "92%",

    borderRadius:30,

    padding:16,

    shadowColor:"#000",

    shadowOpacity:0.15,

    shadowRadius:18,

    shadowOffset:{
        width:0,
        height:8
    },

    elevation:10

},

header:{

    color:"#fff",

    fontFamily:"Montt",

    fontSize:18,

    marginBottom:22,
    width: "70%",

},

scoreRow:{

    flexDirection:"row",

    alignItems:"center",

    marginBottom:25,
    gap: 10

},



score:{

    color:"#fff",

    fontFamily:"Montt",

    fontSize:30

},

over100:{

    color:"rgba(255,255,255,0.8)",

    fontFamily:"Mont",

    fontSize:13

},

level:{

    color:"#E6FFF8",

    fontFamily:"Montt",

    fontSize:15,

    marginBottom:4

},

title:{

    color:"#fff",

    fontFamily:"Montt",

    fontSize:21

},

subtitle:{

    color:"rgba(255,255,255,0.9)",

    fontFamily:"Mont",

    marginTop:6,

    lineHeight:20

},

section:{

    marginTop:10

},

sectionTitle:{

    color:"#fff",

    fontFamily:"Montt",

    marginBottom:10,

    fontSize:15

},

goodItem:{

    color:"#D9FFF4",

    fontFamily:"Mont",

    marginBottom:7,

    fontSize:14

},

badItem:{

    color:"#FFE6B0",

    fontFamily:"Mont",

    marginBottom:7,

    fontSize:14

},

button:{

    marginTop:22,

    backgroundColor:"#fff",

    alignSelf:"center",

    paddingHorizontal:26,

    paddingVertical:14,

    borderRadius:30

},

buttonText:{

    color:"#1a5b4f",

    fontFamily:"Montt",

    fontSize:15

},
  profileButton: { padding: 4, borderRadius: 50, backgroundColor: "#999999", position: "absolute", bottom: -4, right: 1, borderColor: "#f5f5f5", borderWidth: 1 },


});
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
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

    onAction?:()=>void;

};

export default function CoachCard({

    coach,
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

    return(

        <LinearGradient

            colors={["#30a590","#1a5b4f"]}

            style={styles.container}

        >

            <Text style={styles.header}>

                🤖 Coach Briconnect

            </Text>

            <View style={styles.scoreRow}>

                <ScoreRing

    score={coach.score}

    color={progressColor}

/>

                <View style={{flex:1}}>

                    <Text style={styles.level}>

                        {coach.level}

                    </Text>

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

    marginBottom:22

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

}

});
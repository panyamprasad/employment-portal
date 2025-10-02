
export const validateBody = (body, requiredFields = []) => {
    for(const field of requiredFields){
        if(!body[field]){
            return {
                isValid: false,
                error:{
                    statusCode : 400,
                    body: JSON.stringify({
                        message: `Missing required field : ${field}`
                    })
                }
            };
        }
    }
    return{
        isValid: true,
        body
    };
};